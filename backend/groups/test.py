from decimal import Decimal
import requests
from django.test import override_settings
from groups.mpesa.b2c import initiate_b2c_payment
from django.test import TestCase
from django.utils import timezone
import json
from unittest.mock import patch
from django.urls import reverse
from users.models import User
from .models import (Group, GroupMembership, 
                     Cycle, Round, 
                     Contribution, Transaction, 
                     CycleMembership, Payout)
from groups.mpesa.result_codes import get_transaction_status
from .services import (
    process_successful_payment,
    reconcile_pending_transaction,
)
from groups.payout_services import process_b2c_result, process_b2c_timeout,   submit_payout
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


class B2CPayoutServiceTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="b2c_test_user",
            phone_number="254711111110",
            password="testpassword123",
        )

        self.group = Group.objects.create(
            name="B2C Test Group",
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
            name="B2C Test Cycle",
            cycle_number=1,
            start_date=timezone.now().date(),
            status=Cycle.Status.ACTIVE,
        )

        self.round = Round.objects.create(
            cycle=self.cycle,
            round_number=1,
            recipient=self.membership,
            start_date=timezone.now().date(),
            due_date=timezone.now().date(),
            expected_payout_amount=Decimal("5000.00"),
            status=Round.Status.READY_FOR_PAYOUT,
        )

        self.payout = Payout.objects.create(
            round=self.round,
            recipient=self.membership,
            amount=Decimal("5000.00"),
            phone_number="254711111110",
            status=Payout.Status.PENDING,
            originator_conversation_id=None,
        )

    
    def success_result(self, amount="5000"):
        if not self.payout.originator_conversation_id:
            self.payout.originator_conversation_id = "b2ctest000000001"
            self.payout.save(
                update_fields=["originator_conversation_id", "updated_at"]
            )

        return {
            "OriginatorConversationID": self.payout.originator_conversation_id,
            "ConversationID": "AG_20261019_TEST",
            "ResultCode": 0,
            "ResultDesc": "The service request is processed successfully.",
            "TransactionID": "TESTRECEIPT001",
            "ResultParameters": {
                "ResultParameter": [
                    {
                        "Key": "TransactionAmount",
                        "Value": amount,
                    }
                ]
            },
        }


    def test_successful_result_completes_payout_and_round(self):
        process_b2c_result(result=self.success_result())

        self.payout.refresh_from_db()
        self.round.refresh_from_db()
        self.cycle.refresh_from_db()

        self.assertEqual(self.payout.status, Payout.Status.SUCCESS)
        self.assertEqual(
            self.payout.transaction_reference,
            "TESTRECEIPT001",
        )
        self.assertEqual(self.round.status, Round.Status.COMPLETED)
        self.assertEqual(self.cycle.status, Cycle.Status.COMPLETED)

    def test_failed_result_marks_payout_failed(self):
        result = self.success_result()
        result["ResultCode"] = 1
        result["ResultDesc"] = "Test payout failed."
        result.pop("TransactionID")
        result.pop("ResultParameters")

        process_b2c_result(result=result)

        self.payout.refresh_from_db()

        self.assertEqual(self.payout.status, Payout.Status.FAILED)
        self.assertEqual(self.payout.failure_reason, "Test payout failed.")

    def test_duplicate_success_callback_is_idempotent(self):
        result = self.success_result()

        process_b2c_result(result=result)
        process_b2c_result(result=result)

        self.payout.refresh_from_db()

        self.assertEqual(self.payout.status, Payout.Status.SUCCESS)
        self.assertEqual(
            self.payout.transaction_reference,
            "TESTRECEIPT001",
        )

    def test_mismatched_amount_is_rejected(self):
        result = self.success_result(amount="4000")

        with self.assertRaises(ValueError):
            process_b2c_result(result=result)

        self.payout.refresh_from_db()

        self.assertEqual(self.payout.status, Payout.Status.PENDING)

    def test_timeout_keeps_pending_payout_pending(self):
        process_b2c_timeout(
            originator_conversation_id=self.payout.originator_conversation_id,
        )

        self.payout.refresh_from_db()

        self.assertEqual(self.payout.status, Payout.Status.PENDING)

    
    @patch("groups.payout_services.initiate_b2c_payment")
    def test_submit_payout_saves_accepted_conversation_id(self, mock_initiate):
        mock_initiate.return_value = {
            "ResponseCode": "0",
            "ConversationID": "AG_TEST_CONVERSATION_001",
        }

        response = submit_payout(payout_id=self.payout.id)

        self.payout.refresh_from_db()

        self.assertEqual(
            self.payout.conversation_id,
            "AG_TEST_CONVERSATION_001",
        )
        self.assertEqual(response["ResponseCode"], "0")
        mock_initiate.assert_called_once()

    @patch("groups.payout_services.initiate_b2c_payment")
    def test_submit_payout_rejects_nonzero_response_code(self, mock_initiate):
        mock_initiate.return_value = {
            "ResponseCode": "1",
            "ResponseDescription": "Rejected",
        }

        with self.assertRaises(RuntimeError):
            submit_payout(payout_id=self.payout.id)

        self.payout.refresh_from_db()

        self.assertEqual(self.payout.status, Payout.Status.PENDING)
        self.assertTrue(self.payout.originator_conversation_id)
        mock_initiate.assert_called_once()

    @patch("groups.payout_services.initiate_b2c_payment")
    def test_submit_payout_rejects_missing_conversation_id(self, mock_initiate):
        mock_initiate.return_value = {
            "ResponseCode": "0",
        }

        with self.assertRaises(RuntimeError):
            submit_payout(payout_id=self.payout.id)

        self.payout.refresh_from_db()

        self.assertEqual(self.payout.status, Payout.Status.PENDING)
        self.assertTrue(self.payout.originator_conversation_id)
        mock_initiate.assert_called_once()





@override_settings(
    MPESA_ENVIRONMENT="sandbox",
    MPESA_B2C_INITIATOR_NAME="test_initiator",
    MPESA_B2C_SECURITY_CREDENTIAL="test_encrypted_credential",
    MPESA_B2C_SHORTCODE="600000",
    MPESA_B2C_RESULT_URL="https://example.com/mpesa/b2c/result/",
    MPESA_B2C_TIMEOUT_URL="https://example.com/mpesa/b2c/timeout/",
)
class B2CRequestTests(TestCase):

    def setUp(self):
        self.amount = Decimal("5000")
        self.phone_number = "0711111111"
        self.originator_id = "b2ctest00000001"

    def submit_request(self, amount=None):
        return initiate_b2c_payment(
            amount=self.amount if amount is None else amount,
            phone_number=self.phone_number,
            originator_conversation_id=self.originator_id,
            remarks="Merigo Round payout 1",
            occasion="Cycle 1",
        )

    def test_successful_request_sends_correct_payload(self):
        from unittest.mock import Mock

        response = Mock()
        response.json.return_value = {
            "ResponseCode": "0",
            "ConversationID": "AG_TEST_CONVERSATION",
        }

        with (
            patch(
                "groups.mpesa.b2c.get_daraja_access_token",
                return_value="test_access_token",
            ),
            patch(
                "groups.mpesa.b2c.requests.post",
                return_value=response,
            ) as mock_post,
        ):
            result = self.submit_request()

        self.assertEqual(result["ResponseCode"], "0")

        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args

        self.assertEqual(
            args[0],
            "https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest",
        )
        self.assertEqual(kwargs["json"]["Amount"], 5000)
        self.assertEqual(kwargs["json"]["PartyA"], "600000")
        self.assertEqual(kwargs["json"]["PartyB"], "254711111111")
        self.assertEqual(
            kwargs["json"]["OriginatorConversationID"],
            self.originator_id,
        )
        self.assertEqual(
            kwargs["headers"]["Authorization"],
            "Bearer test_access_token",
        )
        self.assertEqual(kwargs["timeout"], 30)
        response.raise_for_status.assert_called_once()

    def test_missing_configuration_is_rejected(self):
        with (
            patch(
                "groups.mpesa.b2c.get_daraja_access_token"
            ) as mock_token,
            patch(
                "groups.mpesa.b2c.requests.post"
            ) as mock_post,
            override_settings(MPESA_B2C_SECURITY_CREDENTIAL=""),
        ):
            with self.assertRaisesMessage(
                ValueError,
                "Missing B2C settings",
            ):
                self.submit_request()

        mock_token.assert_not_called()
        mock_post.assert_not_called()

    def test_non_https_callback_url_is_rejected(self):
        with (
            patch(
                "groups.mpesa.b2c.get_daraja_access_token"
            ) as mock_token,
            override_settings(
                MPESA_B2C_RESULT_URL="http://example.com/result/"
            ),
        ):
            with self.assertRaisesMessage(
                ValueError,
                "must be a valid HTTPS URL",
            ):
                self.submit_request()

        mock_token.assert_not_called()

    def test_zero_amount_is_rejected(self):
        with patch("groups.mpesa.b2c.requests.post") as mock_post:
            with self.assertRaisesMessage(
                ValueError,
                "B2C amount must be a positive whole number",
            ):
                self.submit_request(amount=0)

        mock_post.assert_not_called()

    def test_fractional_amount_is_rejected(self):
        with patch("groups.mpesa.b2c.requests.post") as mock_post:
            with self.assertRaisesMessage(
                ValueError,
                "B2C amount must be a positive whole number",
            ):
                self.submit_request(amount=Decimal("5000.50"))

        mock_post.assert_not_called()

    def test_http_failure_is_converted_to_runtime_error(self):
        with (
            patch(
                "groups.mpesa.b2c.get_daraja_access_token",
                return_value="test_access_token",
            ),
            patch(
                "groups.mpesa.b2c.requests.post",
                side_effect=requests.RequestException("Connection failed"),
            ),
        ):
            with self.assertRaisesMessage(
                RuntimeError,
                "Could not submit the M-Pesa B2C request",
            ):
                self.submit_request()

    def test_invalid_json_response_is_rejected(self):
        from unittest.mock import Mock

        response = Mock()
        response.json.side_effect = ValueError("Invalid JSON")

        with (
            patch(
                "groups.mpesa.b2c.get_daraja_access_token",
                return_value="test_access_token",
            ),
            patch(
                "groups.mpesa.b2c.requests.post",
                return_value=response,
            ),
        ):
            with self.assertRaisesMessage(
                RuntimeError,
                "The M-Pesa B2C API returned an invalid JSON response",
            ):
                self.submit_request()
