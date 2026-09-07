from django.conf import settings
from django.db import models


class Group(models.Model):

    class Frequency(models.TextChoices):
        WEEKLY = "WEEKLY", "Weekly"
        BIWEEKLY = "BIWEEKLY", "Biweekly"
        MONTHLY = "MONTHLY", "Monthly"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        PAUSED = "PAUSED", "Paused"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=150)

    description = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.PROTECT,related_name="created_groups")

    contribution_amount = models.DecimalField(max_digits=12, decimal_places=2)
    frequency = models.CharField( max_length=20, choices=Frequency.choices)
    start_date = models.DateField()
    max_members = models.PositiveIntegerField()
    status = models.CharField(max_length=20,choices=Status.choices,default=Status.DRAFT)
    created_at = models.DateTimeField( auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class GroupMembership(models.Model):

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        TREASURER = "TREASURER", "Treasurer"
        SECRETARY = "SECRETARY", "Secretary"
        MEMBER = "MEMBER", "Member"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACTIVE = "ACTIVE", "Active"
        LEFT = "LEFT", "Left"
        REMOVED = "REMOVED", "Removed"
        SUSPENDED = "SUSPENDED", "Suspended"

    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="group_memberships")
    group = models.ForeignKey(Group, on_delete=models.PROTECT, related_name="memberships")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    joined_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
   

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "group"],
                name="unique_user_group_membership"
            )
        ]

    def __str__(self):
        return f"{self.user} - {self.group}"



class Cycle(models.Model):

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(Group, on_delete=models.PROTECT, related_name="cycles")
    name = models.CharField(max_length=150)
    cycle_number = models.PositiveIntegerField()
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["group", "cycle_number"],
                name="unique_cycle_number_per_group"
            )
        ]
        ordering = ["group", "cycle_number"]

    def __str__(self):
        return f"{self.group.name} - Cycle {self.cycle_number}"



class Round(models.Model):

    class Status(models.TextChoices):
        UPCOMING = "UPCOMING", "Upcoming"
        ACTIVE = "ACTIVE", "Active"
        WAITING_FOR_PAYMENT = "WAITING_FOR_PAYMENT", "Waiting for Payment"
        READY_FOR_PAYOUT = "READY_FOR_PAYOUT", "Ready for Payout"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.BigAutoField(primary_key=True)
    cycle = models.ForeignKey(Cycle, on_delete=models.PROTECT, related_name="rounds")
    round_number = models.PositiveIntegerField()
    recipient = models.ForeignKey(GroupMembership, on_delete=models.PROTECT, related_name="recipient_rounds")
    start_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.UPCOMING)
    expected_payout_amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["cycle", "round_number"],
                name="unique_round_number_per_cycle"
            )
        ]

        indexes = [
            models.Index(
                fields=["cycle", "status"],
                name="round_cycle_status_idx"
            ),
            models.Index(
                fields=["recipient"],
                name="round_recipient_idx"
            ),
        ]

        ordering = ["cycle", "round_number"]

    def __str__(self):
        return f"{self.cycle} - Round {self.round_number}"



class Contribution(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
        PAID = "PAID", "Paid"
        OVERDUE = "OVERDUE", "Overdue"
        WAIVED = "WAIVED", "Waived"

    id = models.BigAutoField(primary_key=True)
    round = models.ForeignKey(Round, on_delete=models.PROTECT, related_name="contributions")
    member = models.ForeignKey(GroupMembership, on_delete=models.PROTECT, related_name="contributions")
    amount_due = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_date = models.DateField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)    

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["round", "member"],
                name="unique_contribution_per_round_member"
            ),
        ]

        indexes = [
            models.Index(
                fields=["round", "status"],
                name="contrib_round_status_idx"
            ),
            models.Index(
                fields=["member", "status"],
                name="contrib_member_status_idx"
            ),
            models.Index(
                fields=["status", "due_date"],
                name="contrib_status_due_idx"
            ),
        ]

        ordering = ["due_date", "id"]

    @property
    def balance(self):
        return self.amount_due - self.amount_paid

    def __str__(self):
        return f"{self.member} - {self.round} - {self.amount_due}"


class Transaction(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.BigAutoField(primary_key=True)
    contribution = models.ForeignKey(Contribution, on_delete=models.PROTECT, related_name="transactions")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    phone_number = models.CharField(max_length=20)
    mpesa_receipt_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    checkout_request_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    merchant_request_id = models.CharField(max_length=100, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    transaction_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        indexes = [
            models.Index(
                fields=["status"],
                name="transaction_status_idx"
            ),
            models.Index(
                fields=["contribution", "status"],
                name="transaction_contrib_status_idx"
            ),
        ]

        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.phone_number} - {self.amount} - {self.status}"