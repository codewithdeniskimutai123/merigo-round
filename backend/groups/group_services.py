from django.db import transaction
from django.utils import timezone

from .models import Group, GroupMembership, Cycle


@transaction.atomic
def create_group(*,user, name, description, contribution_amount, frequency, start_date, max_members,):
    group = Group.objects.create(
        name=name,
        description=description,
        created_by=user,
        contribution_amount=contribution_amount,
        frequency=frequency,
        start_date=start_date,
        max_members=max_members,
        status=Group.Status.DRAFT,
    )

    GroupMembership.objects.create(
        user=user,
        group=group,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
        joined_at=timezone.now(),
    )

    return group


@transaction.atomic
def add_member(*, user, group):
    if group.status != Group.Status.ACTIVE:
        raise ValueError("Members can only be added to an active group.")

    active_members = GroupMembership.objects.filter(
        group=group,
        status=GroupMembership.Status.ACTIVE,
    ).count()

    if active_members >= group.max_members:
        raise ValueError("Group has reached its maximum number of members.")

    if GroupMembership.objects.filter(
        user=user,
        group=group,
    ).exists():
        raise ValueError("User already has a membership in this group.")

    membership = GroupMembership.objects.create(
        user=user,
        group=group,
        role=GroupMembership.Role.MEMBER,
        status=GroupMembership.Status.PENDING,
    )

    return membership

@transaction.atomic
def activate_member( *, membership):
    if membership.status != GroupMembership.Status.PENDING:
        raise ValueError(
            "Only pending memberships can be activated."
        )

    group = membership.group

    active_members = GroupMembership.objects.filter(
        group=group,
        status=GroupMembership.Status.ACTIVE,
    ).count()

    if active_members >= group.max_members:
        raise ValueError(
            "Group has reached its maximum number of members."
        )

    membership.status = GroupMembership.Status.ACTIVE
    membership.joined_at = timezone.now()
    membership.save(
        update_fields=["status", "joined_at", "updated_at"]
    )

    return membership


@transaction.atomic
def create_cycle( *, group, start_date):
    if group.status != Group.Status.ACTIVE:
        raise ValueError(
            "A cycle can only be created for an active group."
        )

    active_members = GroupMembership.objects.filter(
        group=group,
        status=GroupMembership.Status.ACTIVE,
    )

    member_count = active_members.count()

    if member_count < 2:
        raise ValueError(
            "A cycle requires at least two active members."
        )

    last_cycle = (
        group.cycles
        .order_by("-cycle_number")
        .first()
    )

    if last_cycle:
        cycle_number = last_cycle.cycle_number + 1
    else:
        cycle_number = 1

    cycle = Cycle.objects.create(
        group=group,
        name=f"Cycle {cycle_number}",
        cycle_number=cycle_number,
        start_date=start_date,
        status=Cycle.Status.DRAFT,
    )

    return cycle
