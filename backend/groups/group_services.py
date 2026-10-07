from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from .models import (Group, 
                     GroupMembership, 
                     Cycle, CycleMembership, 
                     CycleSwapRequest, Round, 
                     Contribution)


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

@transaction.atomic
def generate_cycle_order(*, cycle):

    if cycle.order_status != Cycle.OrderStatus.PENDING:
        raise ValueError(
            "Cycle order has already been generated."
        )

    active_members = list(
        GroupMembership.objects.filter(
            group=cycle.group,
            status=GroupMembership.Status.ACTIVE,
        ).order_by("joined_at")
    )

    if len(active_members) < 2:
        raise ValueError(
            "A cycle requires at least two active members."
        )

    for position, membership in enumerate(active_members, start=1):
        CycleMembership.objects.create(
            cycle=cycle,
            membership=membership,
            position=position,
        )

    cycle.order_status = Cycle.OrderStatus.OPEN
    cycle.save(update_fields=["order_status", "updated_at"])

    return cycle


@transaction.atomic
def request_cycle_swap(*, requester, target):

    cycle = requester.cycle

    if target.cycle_id != cycle.id:
        raise ValueError(
            "Both members must belong to the same cycle."
        )

    if requester.id == target.id:
        raise ValueError(
            "A member cannot request a swap with herself."
        )

    if cycle.order_status != Cycle.OrderStatus.OPEN:
        raise ValueError(
            "Cycle positions are not open for swapping."
        )

    if cycle.swap_deadline is None:
        raise ValueError(
            "A swap deadline has not been set."
        )

    if timezone.now() > cycle.swap_deadline:
        raise ValueError(
            "The swap deadline has passed."
        )

    existing_request = CycleSwapRequest.objects.filter(
        cycle=cycle,
        requester=requester,
        target=target,
        status=CycleSwapRequest.Status.PENDING,
    ).exists()

    if existing_request:
        raise ValueError(
            "A pending swap request already exists."
        )

    swap_request = CycleSwapRequest.objects.create(
        cycle=cycle,
        requester=requester,
        target=target,
        status=CycleSwapRequest.Status.PENDING,
    )

    return swap_request

@transaction.atomic
def accept_cycle_swap(*, swap_request):

    if swap_request.status != CycleSwapRequest.Status.PENDING:
        raise ValueError(
            "Only pending swap requests can be accepted."
        )

    cycle = swap_request.cycle

    if cycle.order_status != Cycle.OrderStatus.OPEN:
        raise ValueError(
            "Cycle positions are not open for swapping."
        )

    if cycle.swap_deadline is None:
        raise ValueError(
            "A swap deadline has not been set."
        )

    if timezone.now() > cycle.swap_deadline:
        swap_request.status = CycleSwapRequest.Status.EXPIRED
        swap_request.responded_at = timezone.now()
        swap_request.save(
            update_fields=["status", "responded_at"]
        )

        raise ValueError(
            "The swap deadline has passed."
        )

    requester = swap_request.requester
    target = swap_request.target

    requester_position = requester.position
    target_position = target.position

    requester.position = target_position
    target.position = requester_position

    requester.save(
        update_fields=["position", "updated_at"]
    )

    target.save(
        update_fields=["position", "updated_at"]
    )

    swap_request.status = CycleSwapRequest.Status.ACCEPTED
    swap_request.responded_at = timezone.now()
    swap_request.save(
        update_fields=["status", "responded_at"]
    )

    return swap_request


@transaction.atomic
def reject_cycle_swap(*, swap_request):

    if swap_request.status != CycleSwapRequest.Status.PENDING:
        raise ValueError(
            "Only pending swap requests can be rejected."
        )

    cycle = swap_request.cycle

    if cycle.order_status != Cycle.OrderStatus.OPEN:
        raise ValueError(
            "Cycle positions are not open for swapping."
        )

    if cycle.swap_deadline is None:
        raise ValueError(
            "A swap deadline has not been set."
        )

    if timezone.now() > cycle.swap_deadline:
        swap_request.status = CycleSwapRequest.Status.EXPIRED
        swap_request.responded_at = timezone.now()
        swap_request.save(
            update_fields=["status", "responded_at"]
        )

        raise ValueError(
            "The swap deadline has passed."
        )

    swap_request.status = CycleSwapRequest.Status.REJECTED
    swap_request.responded_at = timezone.now()

    swap_request.save(
        update_fields=["status", "responded_at"]
    )

    return swap_request


@transaction.atomic
def finalize_cycle_order(*, cycle):

    if cycle.order_status != Cycle.OrderStatus.OPEN:
        raise ValueError(
            "Only an open cycle order can be finalized."
        )

    if cycle.swap_deadline is None:
        raise ValueError(
            "A swap deadline has not been set."
        )

    if timezone.now() < cycle.swap_deadline:
        raise ValueError(
            "The swap deadline has not passed yet."
        )

    cycle.order_status = Cycle.OrderStatus.LOCKED

    cycle.save(
        update_fields=["order_status", "updated_at"]
    )

    return cycle


def get_round_date(*, start_date, round_number, frequency):

    if round_number < 1:
        raise ValueError(
            "Round number must be at least 1."
        )

    if frequency == Group.Frequency.WEEKLY:
        return start_date + timedelta(
            weeks=round_number - 1
        )

    if frequency == Group.Frequency.BIWEEKLY:
        return start_date + timedelta(
            weeks=2 * (round_number - 1)
        )

    if frequency == Group.Frequency.MONTHLY:
        return start_date + relativedelta(
            months=round_number - 1
        )

    raise ValueError(
        "Unsupported group frequency."
    )



@transaction.atomic
def create_cycle_rounds(*, cycle):

    if cycle.order_status != Cycle.OrderStatus.LOCKED:
        raise ValueError(
            "Rounds can only be created after the cycle order is finalized."
        )

    cycle_memberships = list(
        CycleMembership.objects.filter(
            cycle=cycle
        ).order_by("position")
    )

    if not cycle_memberships:
        raise ValueError(
            "The cycle has no members."
        )

    if cycle.rounds.exists():
        raise ValueError(
            "Rounds have already been created for this cycle."
        )

    member_count = len(cycle_memberships)

    for cycle_membership in cycle_memberships:

        round_date = get_round_date(
            start_date=cycle.start_date,
            round_number=cycle_membership.position,
            frequency=cycle.group.frequency,
        )

        Round.objects.create(
            cycle=cycle,
            round_number=cycle_membership.position,
            recipient=cycle_membership.membership,
            start_date=round_date,
            due_date=round_date,
            expected_payout_amount=(
                cycle.group.contribution_amount * member_count
            ),
            status=Round.Status.UPCOMING,
        )

    return cycle.rounds.all()

@transaction.atomic
def remove_member_from_cycle(*, cycle, membership):

    if cycle.order_status != Cycle.OrderStatus.LOCKED:
        raise ValueError(
            "The cycle order must be finalized before a member can leave."
        )

    if Contribution.objects.filter(round__cycle=cycle).exists():
        raise ValueError(
            "A member cannot leave after contributions have been created."
        )

    cycle_membership = CycleMembership.objects.filter(
        cycle=cycle,
        membership=membership,
    ).first()

    if cycle_membership is None:
        raise ValueError(
            "This member is not part of this cycle."
        )

    cycle_membership.delete()

    remaining_memberships = CycleMembership.objects.filter(
        cycle=cycle
    ).order_by("position")

    for position, remaining_membership in enumerate(
        remaining_memberships,
        start=1,
    ):
        remaining_membership.position = position
        remaining_membership.save(
            update_fields=["position"]
        )

    cycle.rounds.all().delete()

    create_cycle_rounds(cycle=cycle)

    return CycleMembership.objects.filter(
        cycle=cycle
    ).order_by("position")

@transaction.atomic
def create_cycle_contributions(*, cycle):
    if cycle.order_status != Cycle.OrderStatus.LOCKED:
        raise ValueError("Contributions can only be created after the cycle order is finalized.")

    if not cycle.rounds.exists():
        raise ValueError("The cycle has no rounds.")

    if Contribution.objects.filter(round__cycle=cycle).exists():
        raise ValueError("Contributions have already been created for this cycle.")

    cycle_memberships = CycleMembership.objects.filter(
        cycle=cycle
    ).select_related("membership")

    for round in cycle.rounds.all():
        for cycle_membership in cycle_memberships:
            Contribution.objects.create(
                round=round,
                member=cycle_membership.membership,
                amount_due=cycle.group.contribution_amount,
                amount_paid=0,
                due_date=round.due_date,
                status=Contribution.Status.PENDING,
            )

    return Contribution.objects.filter(round__cycle=cycle)


def can_member_request_leave(*, membership):
    latest_cycle = Cycle.objects.filter(
        group=membership.group
    ).order_by("-cycle_number").first()

    if latest_cycle is None:
        return True

    if latest_cycle.status == Cycle.Status.COMPLETED:
        return True

    payout_has_happened = Round.objects.filter(
        cycle=latest_cycle,
        status=Round.Status.COMPLETED
    ).exists()

    if payout_has_happened:
        return False

    return True


@transaction.atomic
def request_member_leave(*, membership):

    if membership.status != GroupMembership.Status.ACTIVE:
        raise ValueError("Only active members can request to leave.")

    if not can_member_request_leave(membership=membership):
        raise ValueError(
            "You cannot leave the group after a payout has started."
        )

    membership.status = GroupMembership.Status.LEAVE_REQUESTED
    membership.save(update_fields=["status", "updated_at"])

    return membership

@transaction.atomic
def deny_member_leave(*, membership):

    if membership.status != GroupMembership.Status.LEAVE_REQUESTED:
        raise ValueError(
            "This member does not have a pending leave request."
        )

    membership.status = GroupMembership.Status.ACTIVE

    membership.save(
        update_fields=["status", "updated_at"]
    )

    return membership


@transaction.atomic
def approve_member_leave(*, membership):

    if membership.status != GroupMembership.Status.LEAVE_REQUESTED:
        raise ValueError(
            "This member does not have a pending leave request."
        )

    current_cycle = Cycle.objects.filter(
        group=membership.group
    ).exclude(
        status__in=[
            Cycle.Status.COMPLETED,
            Cycle.Status.CANCELLED,
        ]
    ).order_by("-cycle_number").first()

    if current_cycle is not None:

        cycle_membership = CycleMembership.objects.filter(
            cycle=current_cycle,
            membership=membership,
        ).first()

        if cycle_membership is not None:

            remove_member_from_cycle(
                cycle=current_cycle,
                membership=membership,
            )

    membership.status = GroupMembership.Status.LEFT

    membership.save(
        update_fields=["status", "updated_at"]
    )

    return membership