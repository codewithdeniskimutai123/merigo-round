from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
import json
from unittest.mock import patch
from django.urls import reverse
from users.models import User
from .models import Group, GroupMembership, Cycle, Round, Contribution, Transaction, CycleMembership
from groups.mpesa.result_codes import get_transaction_status
from .services import (
    process_successful_payment,
    reconcile_pending_transaction,
)
from .group_services import (create_cycle_contributions, 
                             can_member_request_leave, 
                             request_member_leave, 
                             approve_member_leave)
class PaymentServiceTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="mary",
            phone_number="254712345678",
            password="testpassword123",
        )

        self.group = Group.objects.create(
            name="Test Women Group",
            description="Test group",
            created_by=self.user,
            contribution_amount=Decimal("5000.00"),
            frequency=Group.Frequency.MONTHLY,
            start_date=timezone.now().date(),
            max_members=20,
        )

        self.membership = GroupMembership.objects.create(
            user=self.user,
            group=self.group,
            role=GroupMembership.Role.MEMBER,
            status=GroupMembership.Status.ACTIVE,
            joined_at=timezone.now(),
        )

        self.cycle = Cycle.objects.create(
            group=self.group,
            name="Cycle 1",
            cycle_number=1,
            start_date=timezone.now().date(),
        )

        self.round = Round.objects.create(
            cycle=self.cycle,
            round_number=1,
            recipient=self.membership,
            start_date=timezone.now().date(),
            due_date=timezone.now().date(),
            expected_payout_amount=Decimal("5000.00"),
        )

        self.contribution = Contribution.objects.create(
            round=self.round,
            member=self.membership,
            amount_due=Decimal("5000.00"),
            due_date=timezone.now().date(),
        )

    def create_transaction(self, amount="5000.00"):
        return Transaction.objects.create(
            contribution=self.contribution,
            amount=Decimal(amount),
            phone_number="254712345678",
        )

    def test_successful_payment(self):
        payment = self.create_transaction()

        process_successful_payment(
            transaction_id=payment.id,
            amount="5000.00",
        )

        payment.refresh_from_db()
        self.contribution.refresh_from_db()

        self.assertEqual(
            payment.status,
            Transaction.Status.SUCCESS,
        )

        self.assertEqual(
            self.contribution.amount_paid,
            Decimal("5000.00"),
        )

        self.assertEqual(
            self.contribution.status,
            Contribution.Status.PAID,
        )

        self.assertIsNotNone(
            self.contribution.paid_at
        )

    def test_partial_payment(self):
        payment = self.create_transaction("2000.00")

        process_successful_payment(
            transaction_id=payment.id,
            amount="2000.00",
        )

        self.contribution.refresh_from_db()

        self.assertEqual(
            self.contribution.amount_paid,
            Decimal("2000.00"),
        )

        self.assertEqual(
            self.contribution.balance,
            Decimal("3000.00"),
        )

        self.assertEqual(
            self.contribution.status,
            Contribution.Status.PARTIALLY_PAID,
        )

    def test_multiple_partial_payments(self):
        payment1 = self.create_transaction("2000.00")

        process_successful_payment(
            transaction_id=payment1.id,
            amount="2000.00",
        )

        payment2 = self.create_transaction("3000.00")

        process_successful_payment(
            transaction_id=payment2.id,
            amount="3000.00",
        )

        self.contribution.refresh_from_db()

        self.assertEqual(
            self.contribution.amount_paid,
            Decimal("5000.00"),
        )

        self.assertEqual(
            self.contribution.balance,
            Decimal("0.00"),
        )

        self.assertEqual(
            self.contribution.status,
            Contribution.Status.PAID,
        )

    def test_duplicate_payment_callback_is_ignored(self):
        payment = self.create_transaction("5000.00")

        process_successful_payment(
            transaction_id=payment.id,
            amount="5000.00",
        )

        process_successful_payment(
            transaction_id=payment.id,
            amount="5000.00",
        )

        self.contribution.refresh_from_db()

        self.assertEqual(
            self.contribution.amount_paid,
            Decimal("5000.00"),
        )

        self.assertEqual(
            self.contribution.status,
            Contribution.Status.PAID,
        )

    def test_wrong_amount_is_rejected(self):
        payment = self.create_transaction("5000.00")

        with self.assertRaises(ValueError):
            process_successful_payment(
                transaction_id=payment.id,
                amount="3000.00",
            )

        payment.refresh_from_db()
        self.contribution.refresh_from_db()

        self.assertEqual(
            payment.status,
            Transaction.Status.PENDING,
        )

        self.assertEqual(
            self.contribution.amount_paid,
            Decimal("0.00"),
        )

    def test_payment_exceeding_balance_is_rejected(self):
        payment = self.create_transaction("6000.00")

        with self.assertRaises(ValueError):
            process_successful_payment(
                transaction_id=payment.id,
                amount="6000.00",
            )

        payment.refresh_from_db()
        self.contribution.refresh_from_db()

        self.assertEqual(
            payment.status,
            Transaction.Status.PENDING,
        )

        self.assertEqual(
            self.contribution.amount_paid,
            Decimal("0.00"),
        )

    def test_result_code_mapping(self):
        self.assertEqual(
            get_transaction_status(0),
            Transaction.Status.SUCCESS,
        )

        self.assertEqual(
            get_transaction_status(1032),
            Transaction.Status.CANCELLED,
        )

        self.assertEqual(
            get_transaction_status(1),
            Transaction.Status.FAILED,
        )

    def test_mpesa_callback_success(self):
        payment = self.create_transaction("5000.00")

        payment.checkout_request_id = "ws_CO_TEST123"
        payment.save(update_fields=["checkout_request_id"])

        payload = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "29115-34620561-1",
                    "CheckoutRequestID": "ws_CO_TEST123",
                    "ResultCode": 0,
                    "ResultDesc": "The service request is processed successfully.",
                    "CallbackMetadata": {
                        "Item": [
                            {
                                "Name": "Amount",
                                "Value": 5000,
                            },
                            {
                                "Name": "MpesaReceiptNumber",
                                "Value": "QK123ABC",
                            },
                            {
                                "Name": "TransactionDate",
                                "Value": 20260914083000,
                            },
                            {
                                "Name": "PhoneNumber",
                                "Value": 254712345678,
                            },
                        ]
                    },
                }
            }
        }

        response = self.client.post(
            reverse("mpesa_callback"),
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        payment.refresh_from_db()
        self.contribution.refresh_from_db()

        self.assertEqual(
            payment.status,
            Transaction.Status.SUCCESS,
        )

        self.assertEqual(
            payment.mpesa_receipt_number,
            "QK123ABC",
        )

        self.assertEqual(
            self.contribution.amount_paid,
            Decimal("5000.00"),
        )

        self.assertEqual(
            self.contribution.status,
            Contribution.Status.PAID,
        )

    def test_mpesa_callback_duplicate_is_ignored(self):
        payment = self.create_transaction("5000.00")

        payment.checkout_request_id = "ws_CO_DUPLICATE123"
        payment.save(update_fields=["checkout_request_id"])

        payload = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "29115-34620561-1",
                    "CheckoutRequestID": "ws_CO_DUPLICATE123",
                    "ResultCode": 0,
                    "ResultDesc": "The service request is processed successfully.",
                    "CallbackMetadata": {
                        "Item": [
                            {
                                "Name": "Amount",
                                "Value": 5000,
                            },
                            {
                                "Name": "MpesaReceiptNumber",
                                "Value": "QK_DUPLICATE123",
                            },
                            {
                                "Name": "TransactionDate",
                                "Value": 20260914083000,
                            },
                            {
                                "Name": "PhoneNumber",
                                "Value": 254712345678,
                            },
                        ]
                    },
                }
            }
        }

        response = self.client.post(
            reverse("mpesa_callback"),
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        payment.refresh_from_db()
        self.contribution.refresh_from_db()

        self.assertEqual(
            payment.status,
            Transaction.Status.SUCCESS,
        )

        self.assertEqual(
            self.contribution.amount_paid,
            Decimal("5000.00"),
        )

        response = self.client.post(
            reverse("mpesa_callback"),
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        payment.refresh_from_db()
        self.contribution.refresh_from_db()

        self.assertEqual(
            payment.status,
            Transaction.Status.SUCCESS,
        )

        self.assertEqual(
            self.contribution.amount_paid,
            Decimal("5000.00"),
        )

    def test_mpesa_callback_wrong_amount_is_rejected(self):
        payment = self.create_transaction("5000.00")

        payment.checkout_request_id = "ws_CO_WRONG_AMOUNT123"
        payment.save(update_fields=["checkout_request_id"])

        payload = {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "29115-34620561-1",
                    "CheckoutRequestID": "ws_CO_WRONG_AMOUNT123",
                    "ResultCode": 0,
                    "ResultDesc": "The service request is processed successfully.",
                    "CallbackMetadata": {
                        "Item": [
                            {
                                "Name": "Amount",
                                "Value": 4000,
                            },
                            {
                                "Name": "MpesaReceiptNumber",
                                "Value": "QK_WRONG_AMOUNT123",
                            },
                            {
                                "Name": "TransactionDate",
                                "Value": 20260914083000,
                            },
                            {
                                "Name": "PhoneNumber",
                                "Value": 254712345678,
                            },
                        ]
                    },
                }
            }
        }

        response = self.client.post(
            reverse("mpesa_callback"),
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

        payment.refresh_from_db()
        self.contribution.refresh_from_db()

        self.assertEqual(
            payment.status,
            Transaction.Status.PENDING,
        )

        self.assertEqual(
            self.contribution.amount_paid,
            Decimal("0.00"),
        )

        self.assertEqual(
            self.contribution.status,
            Contribution.Status.PENDING,
        )

    @patch("groups.services.query_stk_push")
    def test_reconcile_pending_transaction_success(self, mock_query):
            
            payment = self.create_transaction("5000.00")

            payment.checkout_request_id = "ws_CO_RECONCILE123"
            payment.save(update_fields=["checkout_request_id"])

            mock_query.return_value = {
                "ResultCode": "0",
                "ResultDesc": "The service request is processed successfully.",
            }

            result = reconcile_pending_transaction(payment.id)

            payment.refresh_from_db()
            self.contribution.refresh_from_db()

            self.assertEqual(
                result.status,
                Transaction.Status.SUCCESS,
            )

            self.assertEqual(
                payment.status,
                Transaction.Status.SUCCESS,
            )

            self.assertEqual(
                self.contribution.amount_paid,
                Decimal("5000.00"),
            )

            self.assertEqual(
                self.contribution.status,
                Contribution.Status.PAID,
            )

            mock_query.assert_called_once_with(
                "ws_CO_RECONCILE123"
            )

    @patch("groups.tasks.reconcile_pending_transaction")
    def test_reconcile_pending_transactions_task(
        self,
        mock_reconcile,
    ):
        payment = self.create_transaction("5000.00")

        from groups.tasks import reconcile_pending_transactions

        reconcile_pending_transactions()

        mock_reconcile.assert_called_once_with(payment.id)

class ContributionServiceTests(TestCase):

    def setUp(self):
        self.users = []

        for number in range(4):
            user = User.objects.create_user(
                username=f"member{number}",
                phone_number=f"25471234567{number}",
                password="testpassword123",
            )
            self.users.append(user)

        self.group = Group.objects.create(
            name="Test Women Group",
            description="Test group",
            created_by=self.users[0],
            contribution_amount=Decimal("5000.00"),
            frequency=Group.Frequency.MONTHLY,
            start_date=timezone.now().date(),
            max_members=20,
            status=Group.Status.ACTIVE,
        )

        self.memberships = []

        for user in self.users:
            membership = GroupMembership.objects.create(
                user=user,
                group=self.group,
                role=GroupMembership.Role.MEMBER,
                status=GroupMembership.Status.ACTIVE,
                joined_at=timezone.now(),
            )
            self.memberships.append(membership)

        self.cycle = Cycle.objects.create(
            group=self.group,
            name="Cycle 1",
            cycle_number=1,
            start_date=timezone.now().date(),
            status=Cycle.Status.DRAFT,
            order_status=Cycle.OrderStatus.LOCKED,
        )

        self.cycle_memberships = []

        for position, membership in enumerate(self.memberships, start=1):
            cycle_membership = CycleMembership.objects.create(
                cycle=self.cycle,
                membership=membership,
                position=position,
            )
            self.cycle_memberships.append(cycle_membership)

        for position, cycle_membership in enumerate(
            self.cycle_memberships,
            start=1,
        ):
            Round.objects.create(
                cycle=self.cycle,
                round_number=position,
                recipient=cycle_membership.membership,
                start_date=self.cycle.start_date,
                due_date=self.cycle.start_date,
                expected_payout_amount=Decimal("20000.00"),
                status=Round.Status.UPCOMING,
            )
    def test_create_cycle_contributions_creates_all_contributions(self):
        create_cycle_contributions(cycle=self.cycle)

        contributions = Contribution.objects.filter(
            round__cycle=self.cycle
        )

        self.assertEqual(contributions.count(), 16)

    def test_create_cycle_contributions_sets_correct_values(self):
        create_cycle_contributions(cycle=self.cycle)

        contributions = Contribution.objects.filter(
            round__cycle=self.cycle
        )

        for contribution in contributions:
            self.assertEqual(
                contribution.amount_due,
                Decimal("5000.00"),
            )
            self.assertEqual(
                contribution.amount_paid,
                Decimal("0.00"),
            )
            self.assertEqual(
                contribution.status,
                Contribution.Status.PENDING,
            )
            self.assertEqual(
                contribution.due_date,
                contribution.round.due_date,
            )

class LeaveEligibilityTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="Password123",
            phone_number="0711007001"
        )

        self.member = User.objects.create_user(
            username="member",
            email="member@example.com",
            password="Password123",
            phone_number="0711907001"
        )

        self.group = Group.objects.create(
            name="Test Women Group",
            created_by=self.admin,
            contribution_amount=Decimal("5000.00"),
            frequency=Group.Frequency.MONTHLY,
            start_date=timezone.now().date(),
            max_members=20,
            status=Group.Status.ACTIVE,
        )

        self.membership = GroupMembership.objects.create(
            user=self.member,
            group=self.group,
            role=GroupMembership.Role.MEMBER,
            status=GroupMembership.Status.ACTIVE,
            joined_at=timezone.now(),
        )

        self.cycle = Cycle.objects.create(
            group=self.group,
            name="Cycle 1",
            cycle_number=1,
            start_date=timezone.now().date(),
            status=Cycle.Status.ACTIVE,
        )

    def test_member_can_leave_before_first_payout(self):
        result = can_member_request_leave(
            membership=self.membership
        )

        self.assertTrue(result)

    def test_member_cannot_leave_after_payout(self):
        Round.objects.create(
            cycle=self.cycle,
            round_number=1,
            recipient=self.membership,
            start_date=timezone.now().date(),
            due_date=timezone.now().date(),
            status=Round.Status.COMPLETED,
            expected_payout_amount=Decimal("10000.00"),
        )

        result = can_member_request_leave(
            membership=self.membership
        )

        self.assertFalse(result)

    def test_member_can_leave_after_cycle_completed(self):
        self.cycle.status = Cycle.Status.COMPLETED
        self.cycle.save()

        result = can_member_request_leave(
            membership=self.membership
        )

        self.assertTrue(result)

    def test_active_member_can_request_leave(self):
        membership = request_member_leave(
            membership=self.membership
        )

        self.assertEqual(
            membership.status,
            GroupMembership.Status.LEAVE_REQUESTED
        )

    def test_member_cannot_request_leave_after_payout(self):
        Round.objects.create(
            cycle=self.cycle,
            round_number=1,
            recipient=self.membership,
            start_date=timezone.now().date(),
            due_date=timezone.now().date(),
            status=Round.Status.COMPLETED,
            expected_payout_amount=Decimal("10000.00"),
        )

        with self.assertRaises(ValueError):
            request_member_leave(
                membership=self.membership
            )

        self.membership.refresh_from_db()

        self.assertEqual(
            self.membership.status,
            GroupMembership.Status.ACTIVE
        )

class MemberLeaveApprovalTests(TestCase):

    def setUp(self):
        self.users = []

        for number in range(5):
            user = User.objects.create_user(
                username=f"member{number}",
                phone_number=f"25471234567{number}",
                password="testpassword123",
            )
            self.users.append(user)

        self.group = Group.objects.create(
            name="Test Women Group",
            created_by=self.users[0],
            contribution_amount=Decimal("5000.00"),
            frequency=Group.Frequency.MONTHLY,
            start_date=timezone.now().date(),
            max_members=20,
            status=Group.Status.ACTIVE,
        )

        self.memberships = []

        for user in self.users:
            membership = GroupMembership.objects.create(
                user=user,
                group=self.group,
                role=GroupMembership.Role.MEMBER,
                status=GroupMembership.Status.ACTIVE,
                joined_at=timezone.now(),
            )
            self.memberships.append(membership)

        self.cycle = Cycle.objects.create(
            group=self.group,
            name="Cycle 1",
            cycle_number=1,
            start_date=timezone.now().date(),
            status=Cycle.Status.ACTIVE,
            order_status=Cycle.OrderStatus.LOCKED,
        )

        self.cycle_memberships = []

        for position, membership in enumerate(
            self.memberships,
            start=1,
        ):
            cycle_membership = CycleMembership.objects.create(
                cycle=self.cycle,
                membership=membership,
                position=position,
            )

            self.cycle_memberships.append(
                cycle_membership
            )

        for position, cycle_membership in enumerate(
            self.cycle_memberships,
            start=1,
        ):
            Round.objects.create(
                cycle=self.cycle,
                round_number=position,
                recipient=cycle_membership.membership,
                start_date=self.cycle.start_date,
                due_date=self.cycle.start_date,
                expected_payout_amount=Decimal("25000.00"),
                status=Round.Status.UPCOMING,
            )

    def test_approve_leave_removes_member_from_cycle(self):
        membership = self.memberships[2]

        membership.status = GroupMembership.Status.LEAVE_REQUESTED
        membership.save(update_fields=["status"])

        approve_member_leave(
            membership=membership
        )

        membership.refresh_from_db()

        self.assertEqual(
            membership.status,
            GroupMembership.Status.LEFT,
        )

        self.assertFalse(
            CycleMembership.objects.filter(
                cycle=self.cycle,
                membership=membership,
            ).exists()
        )

    def test_approve_leave_renumbers_positions(self):
        membership = self.memberships[2]

        membership.status = GroupMembership.Status.LEAVE_REQUESTED
        membership.save(update_fields=["status"])

        approve_member_leave(
            membership=membership
        )

        positions = list(
            CycleMembership.objects.filter(
                cycle=self.cycle
            ).order_by("position").values_list(
                "position",
                flat=True,
            )
        )

        self.assertEqual(
            positions,
            [1, 2, 3, 4],
        )

    def test_approve_leave_rebuilds_rounds(self):
        membership = self.memberships[2]

        membership.status = GroupMembership.Status.LEAVE_REQUESTED
        membership.save(update_fields=["status"])

        approve_member_leave(
            membership=membership
        )

        rounds = Round.objects.filter(
            cycle=self.cycle
        ).order_by("round_number")

        self.assertEqual(
            rounds.count(),
            4,
        )

        round_numbers = list(
            rounds.values_list(
                "round_number",
                flat=True,
            )
        )

        self.assertEqual(
            round_numbers,
            [1, 2, 3, 4],
        )

    def test_approve_leave_recalculates_payout_amount(self):
        membership = self.memberships[2]

        membership.status = GroupMembership.Status.LEAVE_REQUESTED
        membership.save(update_fields=["status"])

        approve_member_leave(
            membership=membership
        )

        rounds = Round.objects.filter(
            cycle=self.cycle
        )

        for round in rounds:
            self.assertEqual(
                round.expected_payout_amount,
                Decimal("20000.00"),
            )

    def test_member_cannot_leave_after_contributions_exist(self):
        membership = self.memberships[2]

        membership.status = GroupMembership.Status.LEAVE_REQUESTED
        membership.save(update_fields=["status"])

        Contribution.objects.create(
            round=self.cycle.rounds.first(),
            member=self.memberships[0],
            amount_due=Decimal("5000.00"),
            amount_paid=Decimal("0.00"),
            due_date=self.cycle.start_date,
            status=Contribution.Status.PENDING,
        )

        with self.assertRaises(ValueError):
            approve_member_leave(
                membership=membership
            )

        membership.refresh_from_db()

        self.assertEqual(
            membership.status,
            GroupMembership.Status.LEAVE_REQUESTED,
        )