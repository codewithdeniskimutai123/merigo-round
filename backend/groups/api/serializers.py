
from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal



from groups.models import (
    Group,
    GroupMembership,
    MembershipStatusHistory,
    Cycle,
    Round,
    RoundDateChange,
    Contribution,
    Transaction,
)

from groups.mpesa.phone import normalize_phone_number

class GroupSerializer(serializers.ModelSerializer):
    user_membership_status = serializers.CharField(
        read_only=True,
        allow_null=True,
    )

    user_membership_role = serializers.CharField(
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "description",
            "created_by",
            "contribution_amount",
            "frequency",
            "start_date",
            "max_members",
            "status",
            "user_membership_status",
            "user_membership_role",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "status",
            "user_membership_status",
            "user_membership_role",
            "created_at",
            "updated_at",
        ]

    def validate_contribution_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Contribution amount must be greater than zero."
            )

        return value

    def validate_max_members(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Maximum members must be greater than zero."
            )

        return value


class GroupMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)
    profile_photo = serializers.ImageField(
    source='user.profile_photo',
    read_only=True,
)

    class Meta:
        model = GroupMembership
        fields = [
            "id",
            "user_id",
            "username",
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "profile_photo",
            "role",
            "status",
            "created_at",
        ]

        read_only_fields = fields


class MembershipStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MembershipStatusHistory
        fields = [
            "id",
            "previous_status",
            "new_status",
            "reason",
            "created_at",
        ]
        read_only_fields = fields


class CycleCreateSerializer(serializers.Serializer):
    start_date = serializers.DateField()
    swap_deadline = serializers.DateTimeField()

    def validate_swap_deadline(self, value):
        from django.utils import timezone

        if value <= timezone.now():
            raise serializers.ValidationError(
                "The swap deadline must be in the future."
            )

        return value


class CycleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cycle
        fields = [
            "id",
            "group",
            "name",
            "cycle_number",
            "start_date",
            "end_date",
            "status",
            "swap_deadline",
            "order_status",
        ]

        read_only_fields = fields

class RoundSerializer(serializers.ModelSerializer):
    recipient_details = GroupMembershipSerializer(
        source="recipient",
        read_only=True,
    )

    class Meta:
        model = Round
        fields = [
            "id",
            "cycle",
            "round_number",
            "recipient",
            "recipient_details",
            "start_date",
            "due_date",
            "status",
            "expected_payout_amount",
        ]
        read_only_fields = fields


class ContributionSerializer(serializers.ModelSerializer):
    member_details = GroupMembershipSerializer(
        source="member",
        read_only=True,
    )

    round_number = serializers.IntegerField(
        source="round.round_number",
        read_only=True,
    )

    balance = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    waived_by_username = serializers.CharField(
        source="waived_by.username",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Contribution
        fields = [
            "id",
            "member",
            "member_details",
            "round",
            "round_number",
            "amount_due",
            "amount_paid",
            "amount_waived",
            "balance",
            "waiver_reason",
            "waived_by",
            "waived_by_username",
            "waived_at",
            "due_date",
            "status",
            "paid_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

class RoundDateExtensionSerializer(serializers.Serializer):
    new_due_date = serializers.DateField()
    reason = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
    )

    def validate_new_due_date(self, value):
        round_obj = self.context["round_obj"]

        if value <= round_obj.due_date:
            raise serializers.ValidationError(
                "The new due date must be later than the current due date."
            )

        return value

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Please provide a reason for extending the round."
            )

        return value.strip()



class RoundDateChangeSerializer(serializers.ModelSerializer):
    changed_by_username = serializers.CharField(
        source="changed_by.username",
        read_only=True,
    )

    class Meta:
        model = RoundDateChange
        fields = [
            "id",
            "round",
            "previous_start_date",
            "previous_due_date",
            "new_start_date",
            "new_due_date",
            "reason",
            "changed_by",
            "changed_by_username",
            "created_at",
        ]
        read_only_fields = fields



class CycleUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cycle
        fields = [
            "name",
            "start_date",
            "swap_deadline",
        ]

    def validate(self, attrs):
        cycle = self.instance

        if cycle.status != Cycle.Status.DRAFT:
            raise serializers.ValidationError(
                "Only draft cycles can be edited."
            )

        if cycle.order_status != Cycle.OrderStatus.PENDING:
            raise serializers.ValidationError(
                "A cycle cannot be edited after its draw has started."
            )

        start_date = attrs.get("start_date", cycle.start_date)
        swap_deadline = attrs.get(
            "swap_deadline",
            cycle.swap_deadline,
        )

        if start_date < timezone.localdate():
            raise serializers.ValidationError({
                "start_date": "The cycle start date cannot be in the past."
            })

        if swap_deadline and swap_deadline.date() > start_date:
            raise serializers.ValidationError({
                "swap_deadline": "The swap deadline cannot be after the cycle start date."
            })

        return attrs


class ContributionPaymentInitiationSerializer(serializers.Serializer):
    contribution_id = serializers.IntegerField()
    amount = serializers.IntegerField(min_value=1)
    phone_number = serializers.CharField(max_length=20)

    def validate_phone_number(self, value):
        try:
            return normalize_phone_number(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc))


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id",
            "contribution",
            "amount",
            "phone_number",
            "mpesa_receipt_number",
            "status",
            "transaction_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ContributionWaiverSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
    reason = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
    )

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "A reason is required to waive a contribution."
            )

        return value.strip()