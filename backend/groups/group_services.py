from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from .models import (Group, 
                     Payout,
                     GroupMembership,
                     CycleDrawOption,
                     MembershipStatusHistory,
                     Cycle, CycleMembership, 
                     CycleSwapRequest, Round, 
                     Contribution)



def record_membership_status_change(
    *,
    membership,
    previous_status,
    new_status,
    changed_by,
    reason="",
):
    return MembershipStatusHistory.objects.create(
        membership=membership,
        previous_status=previous_status,
        new_status=new_status,
        changed_by=changed_by,
        reason=reason,
    )



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
def archive_group(*, user, group):

    membership = GroupMembership.objects.filter(
        user=user,
        group=group,
        status=GroupMembership.Status.ACTIVE,
        role=GroupMembership.Role.ADMIN,
    ).first()

    if membership is None:
        raise ValueError(
            "Only an active group admin can archive this group."
        )

    if group.status == Group.Status.ARCHIVED:
        raise ValueError(
            "This group has already been archived."
        )

    group.status = Group.Status.ARCHIVED
    group.save(update_fields=["status", "updated_at"])

    return group

@transaction.atomic
def add_member(*, user, group):
    if group.status != Group.Status.ACTIVE:
        raise ValueError(
            "Members can only request to join an active group."
        )

    membership = GroupMembership.objects.select_for_update().filter(
        user=user,
        group=group,
    ).first()

    if membership:
        if membership.status == GroupMembership.Status.ACTIVE:
            raise ValueError(
                "You are already a member of this group."
            )

        if membership.status == GroupMembership.Status.PENDING:
            raise ValueError(
                "You already have a pending join request."
            )

        if membership.status == GroupMembership.Status.LEAVE_REQUESTED:
            raise ValueError(
                "You already have a pending leave request."
            )

        if membership.status == GroupMembership.Status.SUSPENDED:
            raise ValueError(
                "Your membership is suspended. Contact the group administrator."
            )

        if membership.status not in [
            GroupMembership.Status.LEFT,
            GroupMembership.Status.REMOVED,
            GroupMembership.Status.CANCELLED,
            GroupMembership.Status.REJECTED,
        ]:
            raise ValueError(
                "You cannot request to join this group."
            )

    active_members = GroupMembership.objects.filter(
        group=group,
        status=GroupMembership.Status.ACTIVE,
    ).count()

    if active_members >= group.max_members:
        raise ValueError(
            "Group has reached its maximum number of members."
        )

    if membership:
        previous_status = membership.status

        membership.role = GroupMembership.Role.MEMBER
        membership.status = GroupMembership.Status.PENDING
        membership.joined_at = None

        membership.save(
            update_fields=[
                "role",
                "status",
                "joined_at",
                "updated_at",
            ]
        )

        record_membership_status_change(
            membership=membership,
            previous_status=previous_status,
            new_status=membership.status,
            changed_by=user,
        )

        return membership

    membership = GroupMembership.objects.create(
        user=user,
        group=group,
        role=GroupMembership.Role.MEMBER,
        status=GroupMembership.Status.PENDING,
    )

    record_membership_status_change(
        membership=membership,
        previous_status=None,
        new_status=membership.status,
        changed_by=user,
    )

    return membership


@transaction.atomic
def cancel_join_request(*, user, group):
    membership = GroupMembership.objects.select_for_update().filter(
        user=user,
        group=group,
    ).first()

    if membership is None:
        raise ValueError(
            "You do not have a membership request for this group."
        )

    if membership.status != GroupMembership.Status.PENDING:
        raise ValueError(
            "Only pending join requests can be cancelled."
        )

    membership.status = GroupMembership.Status.CANCELLED

    membership.save(
        update_fields=["status", "updated_at"]
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
def reject_member(*, membership, admin, reason):

    membership = (
        GroupMembership.objects
        .select_for_update()
        .select_related("group")
        .get(pk=membership.pk)
    )

    if not reason or not reason.strip():
        raise ValueError(
            "A rejection reason is required."
        )

    is_admin = GroupMembership.objects.filter(
        group=membership.group,
        user=admin,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        raise ValueError(
            "Only an active group administrator can reject join requests."
        )

    if membership.status != GroupMembership.Status.PENDING:
        raise ValueError(
            "Only pending join requests can be rejected."
        )

    previous_status = membership.status

    membership.status = GroupMembership.Status.REJECTED

    membership.save(
        update_fields=["status", "updated_at"]
    )

    record_membership_status_change(
        membership=membership,
        previous_status=previous_status,
        new_status=membership.status,
        changed_by=admin,
        reason=reason.strip(),
    )

    return membership


@transaction.atomic
def create_cycle(*, group, start_date, swap_deadline):

    group = Group.objects.select_for_update().get(pk=group.pk)

    if group.status != Group.Status.ACTIVE:
        raise ValueError(
            "A cycle can only be created for an active group."
        )

    if swap_deadline is None or swap_deadline <= timezone.now():
        raise ValueError(
            "The swap deadline must be a future date and time."
        )

    active_members = list(
        GroupMembership.objects.filter(
            group=group,
            status=GroupMembership.Status.ACTIVE,
        ).order_by("joined_at", "id")
    )

    member_count = len(active_members)

    if member_count < 2:
        raise ValueError(
            "A cycle requires at least two active members."
        )

    last_cycle = (
        group.cycles
        .order_by("-cycle_number")
        .first()
    )

    cycle_number = (
        last_cycle.cycle_number + 1
        if last_cycle
        else 1
    )

    cycle = Cycle.objects.create(
        group=group,
        name=f"Cycle {cycle_number}",
        cycle_number=cycle_number,
        start_date=start_date,
        swap_deadline=swap_deadline,
        status=Cycle.Status.DRAFT,
        order_status=Cycle.OrderStatus.PENDING,
    )

    cycle_memberships = [
        CycleMembership(
            cycle=cycle,
            membership=membership,
        )
        for membership in active_members
    ]

    CycleMembership.objects.bulk_create(cycle_memberships)

    draw_options = [
        CycleDrawOption(
            cycle=cycle,
            number=number,
        )
        for number in range(1, member_count + 1)
    ]

    CycleDrawOption.objects.bulk_create(draw_options)

    return cycle

def get_cycle_draw_options(*, cycle, membership):

    cycle_membership = CycleMembership.objects.filter(
        cycle=cycle,
        membership=membership,
    ).first()

    if cycle_membership is None:
        raise ValueError(
            "You are not eligible to participate in this cycle's draw."
        )

    if cycle.order_status != Cycle.OrderStatus.PENDING:
        return {
            "options": [],
            "remaining_options": 0,
            "has_selected": True,
            "draw_complete": True,
        }

    has_selected = CycleDrawOption.objects.filter(
        cycle=cycle,
        selected_by=cycle_membership,
    ).exists()

    if has_selected:
        return {
            "options": [],
            "remaining_options": CycleDrawOption.objects.filter(
                cycle=cycle,
                selected_by__isnull=True,
            ).count(),
            "has_selected": True,
            "draw_complete": False,
        }

    available_options = list(
        CycleDrawOption.objects.filter(
            cycle=cycle,
            selected_by__isnull=True,
        ).order_by("?").values_list("token", flat=True)
    )

    return {
        "options": available_options,
        "remaining_options": len(available_options),
        "has_selected": False,
        "draw_complete": False,
    }

@transaction.atomic
def select_cycle_draw_option(*, cycle, membership, token):

    cycle = Cycle.objects.select_for_update().get(
        pk=cycle.pk
    )

    if cycle.status != Cycle.Status.DRAFT:
        raise ValueError(
            "The draw is only available for draft cycles."
        )

    if cycle.order_status != Cycle.OrderStatus.PENDING:
        raise ValueError(
            "The draw has already been completed."
        )

    cycle_membership = CycleMembership.objects.select_for_update().filter(
        cycle=cycle,
        membership=membership,
    ).first()

    if cycle_membership is None:
        raise ValueError(
            "You are not eligible to participate in this cycle's draw."
        )

    already_selected = CycleDrawOption.objects.filter(
        cycle=cycle,
        selected_by=cycle_membership,
    ).exists()

    if already_selected:
        raise ValueError(
            "You have already selected your number."
        )

    draw_option = CycleDrawOption.objects.select_for_update().filter(
        cycle=cycle,
        token=token,
        selected_by__isnull=True,
    ).first()

    if draw_option is None:
        raise ValueError(
            "This draw option is no longer available."
        )

    draw_option.selected_by = cycle_membership
    draw_option.selected_at = timezone.now()

    draw_option.save(
        update_fields=["selected_by", "selected_at"]
    )

    member_count = CycleMembership.objects.filter(
        cycle=cycle
    ).count()

    selected_count = CycleDrawOption.objects.filter(
        cycle=cycle,
        selected_by__isnull=False,
    ).count()

    draw_complete = selected_count == member_count

    if draw_complete:
        cycle_memberships = list(
            CycleMembership.objects.select_for_update().filter(
                cycle=cycle
            ).order_by("id")
        )

        highest_position = max(
            (item.position or 0 for item in cycle_memberships),
            default=0,
        )

        for index, item in enumerate(cycle_memberships, start=1):
            item.position = highest_position + index

            item.save(
                update_fields=["position", "updated_at"]
            )

    
        selected_options = CycleDrawOption.objects.filter(
            cycle=cycle,
            selected_by__isnull=False,
        ).select_related("selected_by")

        for option in selected_options:
            selected_membership = option.selected_by

            selected_membership.selected_number = option.number
            selected_membership.position = option.number

            selected_membership.save(
                update_fields=[
                    "selected_number",
                    "position",
                    "updated_at",
                ]
            )

       
        cycle.order_status = Cycle.OrderStatus.OPEN

        cycle.save(
            update_fields=["order_status", "updated_at"]
        )

    remaining_options = CycleDrawOption.objects.filter(
        cycle=cycle,
        selected_by__isnull=True,
    ).count()

    return {
        "has_selected": True,
        "draw_complete": draw_complete,
        "remaining_options": remaining_options,
    }


@transaction.atomic
def generate_cycle_order(*, cycle):

    cycle = Cycle.objects.select_for_update().get(
        pk=cycle.pk
    )

    if cycle.order_status != Cycle.OrderStatus.PENDING:
        raise ValueError(
            "The cycle draw has already been completed or locked."
        )

    member_count = CycleMembership.objects.filter(
        cycle=cycle
    ).count()

    option_count = CycleDrawOption.objects.filter(
        cycle=cycle
    ).count()

    if member_count < 2 or option_count != member_count:
        raise ValueError(
            "The cycle draw has not been initialized correctly."
        )

    return cycle

@transaction.atomic
def request_cycle_swap(*, requester, target):

    cycle = Cycle.objects.select_for_update().get(
        pk=requester.cycle_id
    )

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

    # Lock both cycle memberships.
    locked_memberships = list(
        CycleMembership.objects.select_for_update()
        .filter(pk__in=[requester.id, target.id])
        .order_by("id")
    )

    if len(locked_memberships) != 2:
        raise ValueError(
            "Both members must belong to this cycle."
        )

    existing_request = CycleSwapRequest.objects.filter(
        cycle=cycle,
        requester_id=requester.id,
        target_id=target.id,
        status=CycleSwapRequest.Status.PENDING,
    ).exists()

    if existing_request:
        raise ValueError(
            "A pending swap request already exists."
        )

    if requester.position is None or target.position is None:
        raise ValueError(
            "Both members must have assigned positions."
        )

    return CycleSwapRequest.objects.create(
        cycle=cycle,
        requester=requester,
        target=target,
        status=CycleSwapRequest.Status.PENDING,
    )


@transaction.atomic
def accept_cycle_swap(*, swap_request):

    cycle = Cycle.objects.select_for_update().get(
        pk=swap_request.cycle_id
    )

    swap_request = CycleSwapRequest.objects.select_for_update().get(
        pk=swap_request.pk
    )

    if swap_request.status != CycleSwapRequest.Status.PENDING:
        raise ValueError(
            "Only pending swap requests can be accepted."
        )

    if cycle.order_status != Cycle.OrderStatus.OPEN:
        raise ValueError(
            "Cycle positions are not open for swapping."
        )

    if cycle.swap_deadline is None:
        raise ValueError(
            "A swap deadline has not been set."
        )

    now = timezone.now()

    if now > cycle.swap_deadline:
        swap_request.status = CycleSwapRequest.Status.EXPIRED
        swap_request.responded_at = now
        swap_request.save(
            update_fields=["status", "responded_at"]
        )

        return swap_request

    requester_id = swap_request.requester_id
    target_id = swap_request.target_id

    locked_memberships = list(
        CycleMembership.objects.select_for_update()
        .filter(pk__in=[requester_id, target_id])
        .order_by("id")
    )

    if len(locked_memberships) != 2:
        raise ValueError(
            "Both members must still belong to this cycle."
        )

    memberships_by_id = {
        membership.id: membership
        for membership in locked_memberships
    }

    requester = memberships_by_id[requester_id]
    target = memberships_by_id[target_id]

    if (
        requester.cycle_id != cycle.id
        or target.cycle_id != cycle.id
    ):
        raise ValueError(
            "Both members must belong to the same cycle."
        )

    requester_position = requester.position
    target_position = target.position

    if requester_position is None or target_position is None:
        raise ValueError(
            "Both members must have assigned positions."
        )

    # Use a temporary position to avoid violating
    # the unique (cycle, position) constraint.
    temporary_position = (
        CycleMembership.objects.filter(
            cycle=cycle
        ).order_by("-position").values_list(
            "position", flat=True
        ).first() or 0
    ) + 1

    requester.position = temporary_position
    requester.save(
        update_fields=["position", "updated_at"]
    )

    target.position = requester_position
    target.save(
        update_fields=["position", "updated_at"]
    )

    requester.position = target_position
    requester.save(
        update_fields=["position", "updated_at"]
    )

    swap_request.status = CycleSwapRequest.Status.ACCEPTED
    swap_request.responded_at = now
    swap_request.save(
        update_fields=["status", "responded_at"]
    )

    return swap_request


@transaction.atomic
def reject_cycle_swap(*, swap_request):

    cycle = Cycle.objects.select_for_update().get(
        pk=swap_request.cycle_id
    )

    swap_request = CycleSwapRequest.objects.select_for_update().get(
        pk=swap_request.pk
    )

    if swap_request.status != CycleSwapRequest.Status.PENDING:
        raise ValueError(
            "Only pending swap requests can be rejected."
        )

    if cycle.order_status != Cycle.OrderStatus.OPEN:
        raise ValueError(
            "Cycle positions are not open for swapping."
        )

    if cycle.swap_deadline is None:
        raise ValueError(
            "A swap deadline has not been set."
        )

    now = timezone.now()

    if now > cycle.swap_deadline:
        swap_request.status = CycleSwapRequest.Status.EXPIRED
        swap_request.responded_at = now
        swap_request.save(
            update_fields=["status", "responded_at"]
        )

        return swap_request

    swap_request.status = CycleSwapRequest.Status.REJECTED
    swap_request.responded_at = now

    swap_request.save(
        update_fields=["status", "responded_at"]
    )

    return swap_request


@transaction.atomic
def finalize_cycle_order(*, cycle):

    cycle = Cycle.objects.select_for_update().get(
        pk=cycle.pk
    )

    if cycle.order_status != Cycle.OrderStatus.OPEN:
        raise ValueError(
            "Only an open cycle order can be finalized."
        )

    if cycle.swap_deadline is None:
        raise ValueError(
            "A swap deadline has not been set."
        )

    now = timezone.now()

    if now < cycle.swap_deadline:
        raise ValueError(
            "The swap deadline has not passed yet."
        )

    # Lock and retrieve all cycle memberships.
    cycle_memberships = list(
        CycleMembership.objects.select_for_update()
        .filter(cycle=cycle)
        .order_by("position", "id")
    )

    if not cycle_memberships:
        raise ValueError(
            "The cycle has no members."
        )

    # Ensure every member has a completed draw and position.
    if any(
        member.selected_number is None or member.position is None
        for member in cycle_memberships
    ):
        raise ValueError(
            "Every member must complete the number draw before finalization."
        )

    positions = [
        member.position
        for member in cycle_memberships
    ]

    if len(positions) != len(set(positions)):
        raise ValueError(
            "Duplicate positions were found. The cycle order cannot be finalized."
        )

    # Requests that were not answered before the deadline expire.
    CycleSwapRequest.objects.filter(
        cycle=cycle,
        status=CycleSwapRequest.Status.PENDING,
    ).update(
        status=CycleSwapRequest.Status.EXPIRED,
        responded_at=now,
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
    cycle = Cycle.objects.select_for_update().get(pk=cycle.pk)

    if cycle.order_status != Cycle.OrderStatus.LOCKED:
        raise ValueError(
            "Rounds can only be created after the cycle order is finalized."
        )

    if cycle.status != Cycle.Status.DRAFT:
        raise ValueError(
            "Rounds can only be created for a draft cycle."
        )

    cycle_memberships = list(
        CycleMembership.objects.select_for_update()
        .filter(cycle=cycle)
        .select_related("membership")
        .order_by("position")
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

    positions = [
        cycle_membership.position
        for cycle_membership in cycle_memberships
    ]

    expected_positions = list(range(1, member_count + 1))

    if positions != expected_positions:
        raise ValueError(
            "The finalized cycle positions must be consecutive, starting from 1."
        )

    for cycle_membership in cycle_memberships:
        if cycle_membership.selected_number is None:
            raise ValueError(
                "Every cycle member must have a completed draw selection."
            )

    rounds = []

    for cycle_membership in cycle_memberships:
        round_date = get_round_date(
            start_date=cycle.start_date,
            round_number=cycle_membership.position,
            frequency=cycle.group.frequency,
        )

        rounds.append(
            Round(
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
        )

    Round.objects.bulk_create(rounds)

    return cycle.rounds.all()


@transaction.atomic
def activate_cycle(*, cycle):
    today = timezone.localdate()

    if cycle.status != Cycle.Status.DRAFT:
        raise ValueError(
            "Only draft cycles can be activated."
        )

    if cycle.order_status != Cycle.OrderStatus.LOCKED:
        raise ValueError(
            "The cycle order must be finalized before activation."
        )

    if cycle.start_date > today:
        raise ValueError(
            "The cycle cannot activate before its start date."
        )

    rounds = list(
        cycle.rounds.order_by("round_number")
    )

    if not rounds:
        raise ValueError(
            "Rounds must be created before cycle activation."
        )

    first_round = rounds[0]

    if first_round.status != Round.Status.UPCOMING:
        raise ValueError(
            "The first round must be upcoming before activation."
        )

    cycle.status = Cycle.Status.ACTIVE
    cycle.save(update_fields=["status", "updated_at"])

    first_round.status = Round.Status.ACTIVE
    first_round.save(update_fields=["status", "updated_at"])

    return cycle



@transaction.atomic
def activate_next_round(*, cycle):
    today = timezone.localdate()

    if cycle.status != Cycle.Status.ACTIVE:
        raise ValueError(
            "Only active cycles can activate their next round."
        )

    rounds = list(
        cycle.rounds.order_by("round_number")
    )

    if not rounds:
        raise ValueError(
            "The cycle has no rounds."
        )

    active_rounds = [
        round_obj
        for round_obj in rounds
        if round_obj.status == Round.Status.ACTIVE
    ]

    if active_rounds:
        raise ValueError(
            "The current round must be completed before activating another round."
        )

    completed_round_numbers = {
        round_obj.round_number
        for round_obj in rounds
        if round_obj.status == Round.Status.COMPLETED
    }

    next_round = next(
        (
            round_obj
            for round_obj in rounds
            if round_obj.status == Round.Status.UPCOMING
        ),
        None,
    )

    if next_round is None:
        if all(
            round_obj.status == Round.Status.COMPLETED
            for round_obj in rounds
        ):
            cycle.status = Cycle.Status.COMPLETED
            cycle.save(update_fields=["status", "updated_at"])
            return None

        raise ValueError(
            "No upcoming round is available to activate."
        )

    if next_round.start_date > today:
        raise ValueError(
            "The next round's start date has not arrived."
        )

    expected_round_number = (
        max(completed_round_numbers, default=0) + 1
    )

    if next_round.round_number != expected_round_number:
        raise ValueError(
            "Rounds must be completed in sequence."
        )

    next_round.status = Round.Status.ACTIVE
    next_round.save(update_fields=["status", "updated_at"])

    return next_round



@transaction.atomic
def update_round_payment_status(*, round_obj):
    today = timezone.localdate()

    if round_obj.status not in [
        Round.Status.ACTIVE,
        Round.Status.WAITING_FOR_PAYMENT,
    ]:
        raise ValueError(
            "Only active rounds can have their payment status updated."
        )

    contributions = list(
        round_obj.contributions.all()
    )

    if not contributions:
        raise ValueError(
            "Contributions must be created before updating payment status."
        )

    outstanding_contributions = [
        contribution
        for contribution in contributions
        if contribution.status not in [
            Contribution.Status.PAID,
            Contribution.Status.WAIVED,
        ]
    ]

    if not outstanding_contributions:
        round_obj.status = Round.Status.READY_FOR_PAYOUT
        round_obj.save(update_fields=["status", "updated_at"])
        return round_obj

    if round_obj.due_date <= today:
        round_obj.status = Round.Status.WAITING_FOR_PAYMENT
        round_obj.save(update_fields=["status", "updated_at"])

    return round_obj




@transaction.atomic
def create_payout(*, round_obj, phone_number):
    round_obj = Round.objects.select_for_update().get(pk=round_obj.pk)

    if round_obj.status != Round.Status.READY_FOR_PAYOUT:
        raise ValueError("The round must be ready for payout.")

    if round_obj.payouts.filter(status=Payout.Status.PENDING).exists():
        raise ValueError("This round already has a pending payout.")

    if round_obj.payouts.filter(status=Payout.Status.SUCCESS).exists():
        raise ValueError("This round has already been paid successfully.")

    if not round_obj.contributions.exists():
        raise ValueError("The round has no contributions.")

    outstanding = round_obj.contributions.exclude(
        status__in=[Contribution.Status.PAID, Contribution.Status.WAIVED]
    ).exists()

    if outstanding:
        raise ValueError("All contributions must be paid or waived before payout.")

    return Payout.objects.create(
        round=round_obj,
        recipient=round_obj.recipient,
        amount=round_obj.expected_payout_amount,
        phone_number=phone_number,
    )




@transaction.atomic
def confirm_payout_success(*, payout, transaction_reference):
    if payout.status == Payout.Status.SUCCESS:
        if payout.transaction_reference == transaction_reference:
            return payout

        raise ValueError(
            "This payout has already been confirmed with a different transaction reference."
        )

    if payout.status != Payout.Status.PENDING:
        raise ValueError(
            "Only pending payouts can be confirmed as successful."
        )

    if payout.round.status != Round.Status.READY_FOR_PAYOUT:
        raise ValueError(
            "The round must be ready for payout."
        )

    if not transaction_reference:
        raise ValueError(
            "A transaction reference is required to confirm the payout."
        )

    payout.status = Payout.Status.SUCCESS
    payout.transaction_reference = transaction_reference
    payout.completed_at = timezone.now()
    payout.save(update_fields=["status", "transaction_reference", "completed_at", "updated_at"])

    round_obj = payout.round
    round_obj.status = Round.Status.COMPLETED
    round_obj.save(update_fields=["status", "updated_at"])

    cycle = round_obj.cycle

    if not cycle.rounds.exclude(status=Round.Status.COMPLETED).exists():
        cycle.status = Cycle.Status.COMPLETED
        cycle.save(update_fields=["status", "updated_at"])

    return payout



@transaction.atomic
def confirm_payout_failure(*, payout, failure_reason):
    if payout.status != Payout.Status.PENDING:
        raise ValueError(
            "Only pending payouts can be marked as failed."
        )

    if not failure_reason:
        raise ValueError(
            "A failure reason is required."
        )

    payout.status = Payout.Status.FAILED
    payout.failure_reason = failure_reason
    payout.completed_at = timezone.now()
    payout.save(update_fields=["status", "failure_reason", "completed_at", "updated_at"])

    return payout



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


@transaction.atomic
def update_group(*, user, group, **validated_data):
    group = Group.objects.select_for_update().get(pk=group.pk)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        raise ValueError("Only an active group admin can edit this group.")

    if group.status != Group.Status.DRAFT:
        raise ValueError("Only draft groups can be edited.")

    active_members_count = GroupMembership.objects.filter(
        group=group,
        status=GroupMembership.Status.ACTIVE,
    ).count()

    new_max_members = validated_data.get(
        "max_members",
        group.max_members,
    )

    if new_max_members < active_members_count:
        raise ValueError(
            "Maximum members cannot be less than the current number of active members."
        )

    for field, value in validated_data.items():
        setattr(group, field, value)

    group.save()

    return group


@transaction.atomic
def delete_group(*, user, group):
    group = Group.objects.select_for_update().get(pk=group.pk)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        raise ValueError("Only an active group admin can delete this group.")

    if group.status != Group.Status.DRAFT:
        raise ValueError("Only draft groups can be deleted.")

    if Cycle.objects.filter(group=group).exists():
        raise ValueError(
            "This group cannot be deleted because it already has cycles."
        )

    memberships = GroupMembership.objects.filter(group=group)

    if memberships.count() != 1:
        raise ValueError(
            "This group cannot be deleted because other membership records exist."
        )

    admin_membership = memberships.first()

    if (
        admin_membership.user_id != group.created_by_id
        or admin_membership.user_id != user.id
        or admin_membership.role != GroupMembership.Role.ADMIN
        or admin_membership.status != GroupMembership.Status.ACTIVE
    ):
        raise ValueError(
            "This group cannot be deleted because its original admin membership has changed."
        )

    admin_membership.delete()
    group.delete()