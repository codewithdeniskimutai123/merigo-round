from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
import json

from django.urls import reverse
from users.models import User
from .models import Group, GroupMembership, Cycle, Round, Contribution, Transaction
from .services import process_successful_payment
from groups.mpesa.result_codes import get_transaction_status

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