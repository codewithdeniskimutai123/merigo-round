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