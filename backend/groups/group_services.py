
from datetime import timedelta

from dateutil.relativedelta import relativedelta

from django.db import transaction
from django.utils import timezone

from .models import (
    Group,
    Payout,
    GroupMembership,
    CycleDrawOption,
    MembershipStatusHistory,
    Cycle,
    CycleMembership,
    CycleSwapRequest,
    Round,
    Contribution,
    RoundDateChange,
)

# ============================================================
# SHARED HELPERS
# ============================================================

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


def is_active_group_admin(*, group, user):
    return GroupMembership.objects.filter(
        group=group,
        user=user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()


def validate_cycle_dates(*, start_date, swap_deadline):
    if start_date < timezone.localdate():
        raise ValueError(
            "The cycle start date cannot be in the past."
        )

    if swap_deadline is None:
        raise ValueError(
            "A swap deadline is required."
        )

    if timezone.is_naive(swap_deadline):
        raise ValueError(
            "The swap deadline must include a valid timezone."
        )

    if swap_deadline <= timezone.now():
        raise ValueError(
            "The swap deadline must be in the future."
        )

    if swap_deadline.date() > start_date:
        raise ValueError(
            "The swap deadline cannot be after the cycle start date."
        )


# ============================================================
# GROUP CREATION AND MANAGEMENT
# ============================================================

@transaction.atomic
def create_group(
    *,
    user,
    name,
    description,
    contribution_amount,
    frequency,
    start_date,
    max_members,
):
    if contribution_amount <= 0:
        raise ValueError(
            "Contribution amount must be greater than zero."
        )

    if max_members < 1:
        raise ValueError(
            "Maximum members must be greater than zero."
        )

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
    group = Group.objects.select_for_update().get(
        pk=group.pk
    )

    if not is_active_group_admin(group=group, user=user):
        raise ValueError(
            "Only an active group admin can archive this group."
        )

    if group.status == Group.Status.ARCHIVED:
        raise ValueError(
            "This group has already been archived."
        )

    unfinished_cycles = Cycle.objects.filter(
        group=group,
        status__in=[
            Cycle.Status.DRAFT,
            Cycle.Status.ACTIVE,
        ],
    ).exists()

    if unfinished_cycles:
        raise ValueError(
            "A group cannot be archived while it has an unfinished cycle."
        )

    group.status = Group.Status.ARCHIVED
    group.save(
        update_fields=["status", "updated_at"]
    )

    return group


@transaction.atomic
def add_member(*, user, group):
    group = Group.objects.select_for_update().get(
        pk=group.pk
    )

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

    previous_status = membership.status

    membership.status = GroupMembership.Status.CANCELLED
    membership.save(
        update_fields=["status", "updated_at"]
    )

    record_membership_status_change(
        membership=membership,
        previous_status=previous_status,
        new_status=membership.status,
        changed_by=user,
        reason="Member cancelled their join request.",
    )

    return membership


@transaction.atomic
def activate_member(*, membership, admin):
    membership = GroupMembership.objects.select_for_update().select_related(
        "group"
    ).get(pk=membership.pk)

    group = Group.objects.select_for_update().get(
        pk=membership.group_id
    )

    if not is_active_group_admin(group=group, user=admin):
        raise ValueError(
            "Only an active group administrator can approve members."
        )

    if membership.status != GroupMembership.Status.PENDING:
        raise ValueError(
            "Only pending memberships can be activated."
        )

    active_members = GroupMembership.objects.filter(
        group=group,
        status=GroupMembership.Status.ACTIVE,
    ).count()

    if active_members >= group.max_members:
        raise ValueError(
            "Group has reached its maximum number of members."
        )

    previous_status = membership.status

    membership.status = GroupMembership.Status.ACTIVE
    membership.joined_at = timezone.now()

    membership.save(
        update_fields=[
            "status",
            "joined_at",
            "updated_at",
        ]
    )

    record_membership_status_change(
        membership=membership,
        previous_status=previous_status,
        new_status=membership.status,
        changed_by=admin,
        reason="Administrator approved the join request.",
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

    if not is_active_group_admin(
        group=membership.group,
        user=admin,
    ):
        raise ValueError(
            "Only an active group administrator can reject join requests."
        )

    if not reason or not reason.strip():
        raise ValueError(
            "A rejection reason is required."
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
def update_group(*, user, group, **validated_data):
    group = Group.objects.select_for_update().get(
        pk=group.pk
    )

    if not is_active_group_admin(group=group, user=user):
        raise ValueError(
            "Only an active group admin can edit this group."
        )

    if group.status != Group.Status.DRAFT:
        raise ValueError(
            "Only draft groups can be edited."
        )

    allowed_fields = {
        "name",
        "description",
        "contribution_amount",
        "frequency",
        "start_date",
        "max_members",
    }

    for field, value in validated_data.items():
        if field not in allowed_fields:
            raise ValueError(
                f"The field '{field}' cannot be edited."
            )

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

    if (
        "contribution_amount" in validated_data
        and validated_data["contribution_amount"] <= 0
    ):
        raise ValueError(
            "Contribution amount must be greater than zero."
        )

    if "max_members" in validated_data and new_max_members <= 0:
        raise ValueError(
            "Maximum members must be greater than zero."
        )

    for field, value in validated_data.items():
        setattr(group, field, value)

    group.save()

    return group


@transaction.atomic
def delete_group(*, user, group):
    group = Group.objects.select_for_update().get(
        pk=group.pk
    )

    if not is_active_group_admin(group=group, user=user):
        raise ValueError(
            "Only an active group admin can delete this group."
        )

    if group.status != Group.Status.DRAFT:
        raise ValueError(
            "Only draft groups can be deleted."
        )

    if Cycle.objects.filter(group=group).exists():
        raise ValueError(
            "This group cannot be deleted because it already has cycles."
        )

    memberships = GroupMembership.objects.filter(
        group=group
    )

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


# ============================================================
# CYCLE CREATION AND DRAW
# ============================================================

@transaction.atomic
def create_cycle(*, group, start_date, swap_deadline):
    group = Group.objects.select_for_update().get(
        pk=group.pk
    )

    if group.status != Group.Status.ACTIVE:
        raise ValueError(
            "A cycle can only be created for an active group."
        )

    validate_cycle_dates(
        start_date=start_date,
        swap_deadline=swap_deadline,
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

    unfinished_cycle_exists = Cycle.objects.filter(
        group=group,
        status__in=[
            Cycle.Status.DRAFT,
            Cycle.Status.ACTIVE,
        ],
    ).exists()

    if unfinished_cycle_exists:
        raise ValueError(
            "The group already has an unfinished cycle."
        )

    last_cycle = group.cycles.order_by(
        "-cycle_number"
    ).first()

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

    CycleMembership.objects.bulk_create([
        CycleMembership(
            cycle=cycle,
            membership=membership,
        )
        for membership in active_members
    ])

    CycleDrawOption.objects.bulk_create([
        CycleDrawOption(
            cycle=cycle,
            number=number,
        )
        for number in range(1, member_count + 1)
    ])

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

    if membership.status != GroupMembership.Status.ACTIVE:
        raise ValueError(
            "Only active group members can participate in the draw."
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

        # Move all existing positions out of the final position range.
        # This prevents collisions with the unique cycle/position constraint.
        for index, item in enumerate(cycle_memberships, start=1):
            item.position = highest_position + index

            item.save(
                update_fields=["position", "updated_at"]
            )

        selected_options = list(
            CycleDrawOption.objects.filter(
                cycle=cycle,
                selected_by__isnull=False,
            ).select_related("selected_by")
        )

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


# ============================================================
# CYCLE POSITION SWAPS
# ============================================================

@transaction.atomic
def request_cycle_swap(*, requester, target):
    cycle = Cycle.objects.select_for_update().get(
        pk=requester.cycle_id
    )

    requester = CycleMembership.objects.select_for_update().select_related(
        "membership"
    ).get(pk=requester.pk)

    target = CycleMembership.objects.select_for_update().select_related(
        "membership"
    ).get(pk=target.pk)

    if target.cycle_id != cycle.id:
        raise ValueError(
            "Both members must belong to the same cycle."
        )

    if requester.id == target.id:
        raise ValueError(
            "A member cannot request a swap with herself."
        )

    if (
        requester.membership.status != GroupMembership.Status.ACTIVE
        or target.membership.status != GroupMembership.Status.ACTIVE
    ):
        raise ValueError(
            "Both members must have active group memberships."
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
        status=CycleSwapRequest.Status.PENDING,
    ).filter(
        requester_id=requester.id,
        target_id=target.id,
    ).exists()

    reverse_request = CycleSwapRequest.objects.filter(
        cycle=cycle,
        status=CycleSwapRequest.Status.PENDING,
        requester_id=target.id,
        target_id=requester.id,
    ).exists()

    if existing_request or reverse_request:
        raise ValueError(
            "A pending swap request already exists between these members."
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
        item.id: item
        for item in locked_memberships
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

    if (
        requester.membership.status != GroupMembership.Status.ACTIVE
        or target.membership.status != GroupMembership.Status.ACTIVE
    ):
        raise ValueError(
            "Both members must have active group memberships."
        )

    requester_position = requester.position
    target_position = target.position

    if requester_position is None or target_position is None:
        raise ValueError(
            "Both members must have assigned positions."
        )

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

    cycle_memberships = list(
        CycleMembership.objects.select_for_update()
        .filter(cycle=cycle)
        .order_by("position", "id")
    )

    if len(cycle_memberships) < 2:
        raise ValueError(
            "The cycle must have at least two members."
        )

    if any(
        item.selected_number is None or item.position is None
        for item in cycle_memberships
    ):
        raise ValueError(
            "Every member must complete the number draw before finalization."
        )

    positions = [
        item.position
        for item in cycle_memberships
    ]

    expected_positions = list(
        range(1, len(cycle_memberships) + 1)
    )

    if sorted(positions) != expected_positions:
        raise ValueError(
            "Cycle positions must be consecutive, starting from 1."
        )

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


# ============================================================
# ROUND DATE CALCULATIONS AND GENERATION
# ============================================================

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


def get_round_due_date(*, start_date, round_number, frequency):
    next_round_date = get_round_date(
        start_date=start_date,
        round_number=round_number + 1,
        frequency=frequency,
    )

    return next_round_date - timedelta(days=1)


@transaction.atomic
def create_cycle_rounds(*, cycle):
    cycle = Cycle.objects.select_for_update().select_related(
        "group"
    ).get(pk=cycle.pk)

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

    member_count = len(cycle_memberships)

    positions = [
        item.position
        for item in cycle_memberships
    ]

    expected_positions = list(
        range(1, member_count + 1)
    )

    if positions != expected_positions:
        raise ValueError(
            "The finalized cycle positions must be consecutive, starting from 1."
        )

    if any(
        item.selected_number is None
        for item in cycle_memberships
    ):
        raise ValueError(
            "Every cycle member must have a completed draw selection."
        )

    existing_rounds = list(
        cycle.rounds.order_by("round_number")
    )

    if existing_rounds:
        if len(existing_rounds) != member_count:
            raise ValueError(
                "The cycle has an incomplete set of rounds. "
                "The existing rounds must be reviewed before continuing."
            )

        for index, round_obj in enumerate(existing_rounds, start=1):
            expected_recipient_id = cycle_memberships[index - 1].membership_id

            if (
                round_obj.round_number != index
                or round_obj.recipient_id != expected_recipient_id
            ):
                raise ValueError(
                    "Existing rounds do not match the finalized cycle order."
                )

        return existing_rounds

    rounds = []

    for cycle_membership in cycle_memberships:
        round_number = cycle_membership.position

        round_date = get_round_date(
            start_date=cycle.start_date,
            round_number=round_number,
            frequency=cycle.group.frequency,
        )

        due_date = get_round_due_date(
            start_date=cycle.start_date,
            round_number=round_number,
            frequency=cycle.group.frequency,
        )

        rounds.append(
            Round(
                cycle=cycle,
                round_number=round_number,
                recipient=cycle_membership.membership,
                start_date=round_date,
                due_date=due_date,
                expected_payout_amount=(
                    cycle.group.contribution_amount * member_count
                ),
                status=Round.Status.UPCOMING,
            )
        )

    Round.objects.bulk_create(rounds)

    cycle.end_date = rounds[-1].due_date
    cycle.save(
        update_fields=["end_date", "updated_at"]
    )

    return cycle.rounds.order_by("round_number")


@transaction.atomic
def update_cycle(*, cycle, **validated_data):
    locked_cycle = Cycle.objects.select_for_update().get(
        pk=cycle.pk
    )

    if locked_cycle.status != Cycle.Status.DRAFT:
        raise ValueError(
            "Only draft cycles can be edited."
        )

    if locked_cycle.order_status != Cycle.OrderStatus.PENDING:
        raise ValueError(
            "A cycle cannot be edited after its draw has started."
        )

    if Round.objects.filter(cycle=locked_cycle).exists():
        raise ValueError(
            "A cycle with generated rounds cannot be edited."
        )

    allowed_fields = {
        "name",
        "start_date",
        "swap_deadline",
    }

    for field in validated_data:
        if field not in allowed_fields:
            raise ValueError(
                f"The field '{field}' cannot be edited."
            )

    new_start_date = validated_data.get(
        "start_date",
        locked_cycle.start_date,
    )

    new_swap_deadline = validated_data.get(
        "swap_deadline",
        locked_cycle.swap_deadline,
    )

    if (
        "start_date" in validated_data
        or "swap_deadline" in validated_data
    ):
        validate_cycle_dates(
            start_date=new_start_date,
            swap_deadline=new_swap_deadline,
        )

    for field, value in validated_data.items():
        setattr(locked_cycle, field, value)

    locked_cycle.save()

    return locked_cycle


# ============================================================
# CYCLE ACTIVATION AND PROGRESSION
# ============================================================

@transaction.atomic
def activate_cycle(*, cycle):
    cycle = Cycle.objects.select_for_update().get(
        pk=cycle.pk
    )

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
            "The cycle cannot be activated before its scheduled start date."
        )

    if not Round.objects.filter(cycle=cycle).exists():
        create_cycle_rounds(cycle=cycle)

    create_cycle_contributions(cycle=cycle)

    rounds = list(
        Round.objects.select_for_update()
        .filter(cycle=cycle)
        .order_by("round_number")
    )

    if not rounds:
        raise ValueError(
            "The cycle has no rounds to activate."
        )

    first_round = rounds[0]

    if first_round.round_number != 1:
        raise ValueError(
            "The first round must have round number 1."
        )

    if first_round.start_date > today:
        raise ValueError(
            "The first round cannot be activated before its scheduled start date."
        )

    if first_round.status != Round.Status.UPCOMING:
        raise ValueError(
            "The first round must be upcoming before the cycle can be activated."
        )

    if any(
        round_obj.status == Round.Status.ACTIVE
        for round_obj in rounds
    ):
        raise ValueError(
            "A round is already active in this cycle."
        )

    expected_contribution_count = (
        len(rounds)
        * CycleMembership.objects.filter(cycle=cycle).count()
    )

    actual_contribution_count = Contribution.objects.filter(
        round__cycle=cycle
    ).count()

    if actual_contribution_count != expected_contribution_count:
        raise ValueError(
            "The cycle contribution records are incomplete."
        )

    cycle.status = Cycle.Status.ACTIVE
    cycle.save(
        update_fields=["status", "updated_at"]
    )

    first_round.status = Round.Status.ACTIVE
    first_round.save(
        update_fields=["status", "updated_at"]
    )

    return cycle


@transaction.atomic
def activate_next_round(*, cycle):
    cycle = Cycle.objects.select_for_update().get(
        pk=cycle.pk
    )

    today = timezone.localdate()

    if cycle.status != Cycle.Status.ACTIVE:
        raise ValueError(
            "Only active cycles can progress to the next round."
        )

    rounds = list(
        Round.objects.select_for_update()
        .filter(cycle=cycle)
        .order_by("round_number")
    )

    if not rounds:
        raise ValueError(
            "This cycle has no rounds."
        )

    active_rounds = [
        item
        for item in rounds
        if item.status == Round.Status.ACTIVE
    ]

    if active_rounds:
        raise ValueError(
            "The current active round must be completed before activating another round."
        )

    next_round = next(
        (
            item
            for item in rounds
            if item.status == Round.Status.UPCOMING
        ),
        None,
    )

    if next_round is None:
        all_rounds_completed = all(
            item.status == Round.Status.COMPLETED
            for item in rounds
        )

        if not all_rounds_completed:
            raise ValueError(
                "The cycle cannot be completed because some rounds are not completed."
            )

        successful_payouts = Payout.objects.filter(
            round__cycle=cycle,
            status=Payout.Status.SUCCESS,
        ).count()

        if successful_payouts != len(rounds):
            raise ValueError(
                "The cycle cannot be completed until every round has a successful payout."
            )

        cycle.status = Cycle.Status.COMPLETED
        cycle.save(
            update_fields=["status", "updated_at"]
        )

        return None

    previous_round = next(
        (
            item
            for item in rounds
            if item.round_number == next_round.round_number - 1
        ),
        None,
    )

    if previous_round is None:
        raise ValueError(
            "The previous round could not be found."
        )

    if previous_round.status != Round.Status.COMPLETED:
        raise ValueError(
            "The previous round must be completed before the next round can start."
        )

    payout_successful = Payout.objects.filter(
        round=previous_round,
        status=Payout.Status.SUCCESS,
    ).exists()

    if not payout_successful:
        raise ValueError(
            "The previous round's payout must be successfully confirmed before the next round can start."
        )

    if next_round.round_number != previous_round.round_number + 1:
        raise ValueError(
            "Rounds must be activated in sequential order."
        )

    if next_round.start_date > today:
        raise ValueError(
            "The next round cannot be activated before its scheduled start date."
        )

    next_round.status = Round.Status.ACTIVE
    next_round.save(
        update_fields=["status", "updated_at"]
    )

    return next_round


# ============================================================
# CONTRIBUTION STATUS
# ============================================================

@transaction.atomic
def update_round_payment_status(*, round_obj):
    round_obj = Round.objects.select_for_update().get(
        pk=round_obj.pk
    )

    if round_obj.status not in [
        Round.Status.ACTIVE,
        Round.Status.WAITING_FOR_PAYMENT,
    ]:
        raise ValueError(
            "Payment status can only be updated for an active round."
        )

    today = timezone.localdate()

    contributions = list(
        Contribution.objects.select_for_update().filter(
            round=round_obj
        )
    )

    if not contributions:
        raise ValueError(
            "This round has no contribution records."
        )

    outstanding_contributions = []

    for contribution in contributions:
        if contribution.status == Contribution.Status.WAIVED:
            continue

        if contribution.amount_paid >= contribution.amount_due:
            if contribution.status != Contribution.Status.PAID:
                contribution.status = Contribution.Status.PAID
                contribution.save(
                    update_fields=["status", "updated_at"]
                )

        elif contribution.due_date <= today:
            if contribution.status != Contribution.Status.OVERDUE:
                contribution.status = Contribution.Status.OVERDUE
                contribution.save(
                    update_fields=["status", "updated_at"]
                )

            outstanding_contributions.append(contribution)

        elif contribution.amount_paid > 0:
            if contribution.status != Contribution.Status.PARTIALLY_PAID:
                contribution.status = Contribution.Status.PARTIALLY_PAID
                contribution.save(
                    update_fields=["status", "updated_at"]
                )

            outstanding_contributions.append(contribution)

        else:
            if contribution.status != Contribution.Status.PENDING:
                contribution.status = Contribution.Status.PENDING
                contribution.save(
                    update_fields=["status", "updated_at"]
                )

            outstanding_contributions.append(contribution)

    if not outstanding_contributions:
        round_obj.status = Round.Status.READY_FOR_PAYOUT

    elif any(
        item.due_date <= today
        for item in outstanding_contributions
    ):
        round_obj.status = Round.Status.WAITING_FOR_PAYMENT

    else:
        round_obj.status = Round.Status.ACTIVE

    round_obj.save(
        update_fields=["status", "updated_at"]
    )

    return round_obj


# ============================================================
# PAYOUT SERVICES
# Existing payment/payout workflow retained.
# ============================================================

@transaction.atomic
def create_payout(*, round_obj, phone_number):
    round_obj = Round.objects.select_for_update().select_related(
        "cycle",
        "recipient",
    ).get(pk=round_obj.pk)

    if round_obj.status != Round.Status.READY_FOR_PAYOUT:
        raise ValueError(
            "The round must be ready for payout before a payout can be created."
        )

    if not phone_number:
        raise ValueError(
            "A recipient phone number is required for the payout."
        )

    if not round_obj.recipient_id:
        raise ValueError(
            "This round has no assigned payout recipient."
        )

    existing_payouts = Payout.objects.select_for_update().filter(
        round=round_obj
    )

    if existing_payouts.filter(
        status__in=[
            Payout.Status.PENDING,
            Payout.Status.SUCCESS,
        ]
    ).exists():
        raise ValueError(
            "A pending or successful payout already exists for this round."
        )

    contributions = list(
        Contribution.objects.select_for_update().filter(
            round=round_obj
        )
    )

    if not contributions:
        raise ValueError(
            "This round has no contribution records."
        )

    outstanding = [
        item
        for item in contributions
        if item.status not in [
            Contribution.Status.PAID,
            Contribution.Status.WAIVED,
        ]
        or item.amount_paid < item.amount_due
    ]

    if outstanding:
        raise ValueError(
            "All contributions must be fully paid or waived before payout."
        )

    if round_obj.expected_payout_amount <= 0:
        raise ValueError(
            "The expected payout amount must be greater than zero."
        )

    return Payout.objects.create(
        round=round_obj,
        recipient=round_obj.recipient,
        amount=round_obj.expected_payout_amount,
        phone_number=phone_number,
        status=Payout.Status.PENDING,
    )


@transaction.atomic
def confirm_payout_success(*, payout, transaction_reference):
    payout = Payout.objects.select_for_update().get(
        pk=payout.pk
    )

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

    if not transaction_reference:
        raise ValueError(
            "A transaction reference is required."
        )

    round_obj = Round.objects.select_for_update().get(
        pk=payout.round_id
    )

    cycle = Cycle.objects.select_for_update().get(
        pk=round_obj.cycle_id
    )

    if round_obj.status != Round.Status.READY_FOR_PAYOUT:
        raise ValueError(
            "The round must be ready for payout before confirmation."
        )

    if payout.recipient_id != round_obj.recipient_id:
        raise ValueError(
            "The payout recipient does not match the round recipient."
        )

    if payout.amount != round_obj.expected_payout_amount:
        raise ValueError(
            "The payout amount does not match the expected round payout."
        )

    payout.status = Payout.Status.SUCCESS
    payout.transaction_reference = transaction_reference
    payout.completed_at = timezone.now()

    payout.save(
        update_fields=[
            "status",
            "transaction_reference",
            "completed_at",
            "updated_at",
        ]
    )

    round_obj.status = Round.Status.COMPLETED
    round_obj.save(
        update_fields=["status", "updated_at"]
    )

    total_rounds = Round.objects.filter(
        cycle=cycle
    ).count()

    completed_rounds = Round.objects.filter(
        cycle=cycle,
        status=Round.Status.COMPLETED,
    ).count()

    successful_payouts = Payout.objects.filter(
        round__cycle=cycle,
        status=Payout.Status.SUCCESS,
    ).count()

    if (
        total_rounds > 0
        and completed_rounds == total_rounds
        and successful_payouts == total_rounds
    ):
        cycle.status = Cycle.Status.COMPLETED
        cycle.save(
            update_fields=["status", "updated_at"]
        )

    return payout


@transaction.atomic
def confirm_payout_failure(*, payout, failure_reason):
    payout = Payout.objects.select_for_update().get(
        pk=payout.pk
    )

    if payout.status != Payout.Status.PENDING:
        raise ValueError(
            "Only pending payouts can be marked as failed."
        )

    if not failure_reason or not failure_reason.strip():
        raise ValueError(
            "A failure reason is required."
        )

    payout.status = Payout.Status.FAILED
    payout.failure_reason = failure_reason.strip()

    payout.save(
        update_fields=[
            "status",
            "failure_reason",
            "updated_at",
        ]
    )

    return payout


# ============================================================
# MEMBER REMOVAL FROM A DRAFT CYCLE
# ============================================================

@transaction.atomic
def remove_member_from_cycle(*, cycle, membership):
    cycle = Cycle.objects.select_for_update().get(
        pk=cycle.pk
    )

    if cycle.status != Cycle.Status.DRAFT:
        raise ValueError(
            "Members can only be removed from a draft cycle."
        )

    if cycle.order_status != Cycle.OrderStatus.LOCKED:
        raise ValueError(
            "The cycle order must be finalized before a member can leave."
        )

    cycle_membership = CycleMembership.objects.select_for_update().filter(
        cycle=cycle,
        membership=membership,
    ).first()

    if cycle_membership is None:
        raise ValueError(
            "This member is not part of this cycle."
        )

    current_member_count = CycleMembership.objects.filter(
        cycle=cycle
    ).count()

    if current_member_count <= 2:
        raise ValueError(
            "A cycle must have at least two members. "
            "The member cannot be removed because only two members remain."
        )

    if Contribution.objects.filter(
        round__cycle=cycle
    ).exists():
        raise ValueError(
            "A member cannot leave after contributions have been created."
        )

    if Payout.objects.filter(
        round__cycle=cycle
    ).exists():
        raise ValueError(
            "A member cannot leave after payout records have been created."
        )

    # CycleDrawOption.selected_by uses PROTECT.
    # Release the selected draw option before deleting the membership.
    CycleDrawOption.objects.filter(
        selected_by=cycle_membership
    ).update(
        selected_by=None,
        selected_at=None,
    )

    # CycleSwapRequest requester and target use PROTECT.
    # These requests belong to an unfinished draft cycle and cannot
    # remain attached to a member who is being removed from that cycle.
    CycleSwapRequest.objects.filter(
        requester=cycle_membership
    ).delete()

    CycleSwapRequest.objects.filter(
        target=cycle_membership
    ).delete()

    cycle_membership.delete()

    remaining_memberships = list(
        CycleMembership.objects.select_for_update()
        .filter(cycle=cycle)
        .order_by("position", "id")
    )

    if len(remaining_memberships) < 2:
        raise ValueError(
            "A cycle must have at least two members."
        )

    # First move every remaining position outside the final range.
    highest_position = max(
        (item.position or 0 for item in remaining_memberships),
        default=0,
    )

    for index, item in enumerate(remaining_memberships, start=1):
        item.position = highest_position + index
        item.save(
            update_fields=["position", "updated_at"]
        )

    # Then assign consecutive positions.
    for position, item in enumerate(remaining_memberships, start=1):
        item.position = position
        item.save(
            update_fields=["position", "updated_at"]
        )

    # No financial records exist, so the draft rounds can be regenerated.
    cycle.rounds.all().delete()

    create_cycle_rounds(cycle=cycle)

    return CycleMembership.objects.filter(
        cycle=cycle
    ).order_by("position")


# ============================================================
# ROUND DATE EXTENSION
# ============================================================


@transaction.atomic
def extend_round_due_date(
    *,
    round_obj,
    new_due_date,
    reason,
    changed_by,
):
    round_obj = (
        Round.objects.select_for_update()
        .select_related("cycle")
        .get(pk=round_obj.pk)
    )

    cycle = Cycle.objects.select_for_update().get(
        pk=round_obj.cycle_id
    )

    if not is_active_group_admin(
        group=cycle.group,
        user=changed_by,
    ):
        raise ValueError(
            "Only an active group administrator can extend round dates."
        )

    if cycle.status != Cycle.Status.ACTIVE:
        raise ValueError(
            "Only rounds in an active cycle can have their dates extended."
        )

    if round_obj.status not in [
        Round.Status.ACTIVE,
        Round.Status.WAITING_FOR_PAYMENT,
    ]:
        raise ValueError(
            "Only an active round or a round waiting for payment can be extended."
        )

    if not new_due_date:
        raise ValueError(
            "A new due date is required."
        )

    if new_due_date <= round_obj.due_date:
        raise ValueError(
            "The new due date must be later than the current due date."
        )

    if not reason or not reason.strip():
        raise ValueError(
            "A reason for the date extension is required."
        )

    if not changed_by:
        raise ValueError(
            "The administrator making the change is required."
        )

    days_extended = (
        new_due_date - round_obj.due_date
    ).days

    affected_rounds = list(
        Round.objects.select_for_update()
        .filter(
            cycle=cycle,
            round_number__gte=round_obj.round_number,
        )
        .order_by("round_number")
    )

    if not affected_rounds or affected_rounds[0].pk != round_obj.pk:
        raise ValueError(
            "The selected round could not be found."
        )

    # Validate every affected round before changing any dates.
    for affected_round in affected_rounds:
        if affected_round.status in [
            Round.Status.COMPLETED,
            Round.Status.CANCELLED,
            Round.Status.READY_FOR_PAYOUT,
        ]:
            raise ValueError(
                "Dates cannot be extended when an affected round has already reached payout or completion."
            )

        # Pending and successful payouts prevent date extensions.
        # Failed and cancelled payouts do not.
        if Payout.objects.filter(
            round=affected_round,
            status__in=[
                Payout.Status.PENDING,
                Payout.Status.SUCCESS,
            ],
        ).exists():
            raise ValueError(
                "Dates cannot be extended while an affected round has a pending or successful payout."
            )

    # Update the selected round and all subsequent rounds.
    for affected_round in affected_rounds:
        previous_start_date = affected_round.start_date
        previous_due_date = affected_round.due_date

        if affected_round.pk == round_obj.pk:
            # Keep the selected round's start date unchanged.
            updated_start_date = previous_start_date
            updated_due_date = new_due_date
        else:
            # Shift subsequent rounds by the same extension period.
            updated_start_date = (
                previous_start_date + timedelta(days=days_extended)
            )

            updated_due_date = (
                previous_due_date + timedelta(days=days_extended)
            )

        # Preserve the history of every affected round.
        RoundDateChange.objects.create(
            round=affected_round,
            previous_start_date=previous_start_date,
            previous_due_date=previous_due_date,
            new_start_date=updated_start_date,
            new_due_date=updated_due_date,
            reason=reason.strip(),
            changed_by=changed_by,
        )

        affected_round.start_date = updated_start_date
        affected_round.due_date = updated_due_date

        affected_round.save(
            update_fields=[
                "start_date",
                "due_date",
                "updated_at",
            ]
        )

        # Keep contribution deadlines synchronized with round deadlines.
        Contribution.objects.filter(
            round=affected_round
        ).update(
            due_date=updated_due_date,
            updated_at=timezone.now(),
        )

    # Update the cycle's final end date.
    cycle.end_date = affected_rounds[-1].due_date

    cycle.save(
        update_fields=["end_date", "updated_at"]
    )

    return Round.objects.filter(
        cycle=cycle
    ).order_by("round_number")


# ============================================================
# CONTRIBUTION GENERATION
# ============================================================

@transaction.atomic
def create_cycle_contributions(*, cycle):
    cycle = Cycle.objects.select_for_update().get(
        pk=cycle.pk
    )

    if cycle.order_status != Cycle.OrderStatus.LOCKED:
        raise ValueError(
            "The cycle order must be finalized before contributions can be created."
        )

    if cycle.status not in [
        Cycle.Status.DRAFT,
        Cycle.Status.ACTIVE,
    ]:
        raise ValueError(
            "Contributions can only be generated for a draft or active cycle."
        )

    rounds = list(
        Round.objects.select_for_update()
        .filter(cycle=cycle)
        .order_by("round_number")
    )

    if not rounds:
        raise ValueError(
            "The cycle has no rounds. Create the cycle rounds first."
        )

    cycle_memberships = list(
        CycleMembership.objects.select_related("membership")
        .filter(cycle=cycle)
        .order_by("position")
    )

    if not cycle_memberships:
        raise ValueError(
            "The cycle has no members."
        )

    if len(rounds) != len(cycle_memberships):
        raise ValueError(
            "The number of rounds must match the number of cycle members."
        )

    expected_round_numbers = list(
        range(1, len(rounds) + 1)
    )

    actual_round_numbers = [
        item.round_number
        for item in rounds
    ]

    if actual_round_numbers != expected_round_numbers:
        raise ValueError(
            "Cycle rounds must have consecutive round numbers starting from 1."
        )

    membership_ids = {
        item.membership_id
        for item in cycle_memberships
    }

    existing_contributions = list(
        Contribution.objects.select_for_update()
        .filter(round__cycle=cycle)
    )

    for contribution in existing_contributions:
        if contribution.member_id not in membership_ids:
            raise ValueError(
                "An existing contribution belongs to someone outside this cycle."
            )

    existing_keys = {
        (item.round_id, item.member_id)
        for item in existing_contributions
    }

    contributions_to_create = []

    for round_obj in rounds:
        for cycle_membership in cycle_memberships:
            member_id = cycle_membership.membership_id
            contribution_key = (
                round_obj.id,
                member_id,
            )

            if contribution_key in existing_keys:
                continue

            contributions_to_create.append(
                Contribution(
                    round=round_obj,
                    member_id=member_id,
                    amount_due=cycle.group.contribution_amount,
                    amount_paid=0,
                    due_date=round_obj.due_date,
                    status=Contribution.Status.PENDING,
                )
            )

    if contributions_to_create:
        Contribution.objects.bulk_create(
            contributions_to_create
        )

    return (
        Contribution.objects
        .filter(round__cycle=cycle)
        .select_related("round", "member")
        .order_by("round__round_number", "member_id")
    )


# ============================================================
# MEMBER LEAVE REQUESTS
# ============================================================

def can_member_request_leave(*, membership):
    latest_cycle = Cycle.objects.filter(
        group=membership.group
    ).order_by("-cycle_number").first()

    if latest_cycle is None:
        return True

    if latest_cycle.status in [
        Cycle.Status.COMPLETED,
        Cycle.Status.CANCELLED,
    ]:
        return True

    payout_has_happened = Round.objects.filter(
        cycle=latest_cycle,
        status=Round.Status.COMPLETED,
    ).exists()

    return not payout_has_happened


@transaction.atomic
def request_member_leave(*, membership):
    membership = GroupMembership.objects.select_for_update().get(
        pk=membership.pk
    )

    if membership.status != GroupMembership.Status.ACTIVE:
        raise ValueError(
            "Only active members can request to leave."
        )

    if not can_member_request_leave(membership=membership):
        raise ValueError(
            "You cannot leave the group after a payout has started."
        )

    previous_status = membership.status

    membership.status = GroupMembership.Status.LEAVE_REQUESTED
    membership.save(
        update_fields=["status", "updated_at"]
    )

    record_membership_status_change(
        membership=membership,
        previous_status=previous_status,
        new_status=membership.status,
        reason="Member requested to leave the group.",
        changed_by=membership.user,
    )

    return membership


@transaction.atomic
def cancel_member_leave_request(*, membership):
    membership = GroupMembership.objects.select_for_update().get(
        pk=membership.pk
    )

    if membership.status != GroupMembership.Status.LEAVE_REQUESTED:
        raise ValueError(
            "There is no pending leave request to cancel."
        )

    previous_status = membership.status

    membership.status = GroupMembership.Status.ACTIVE
    membership.save(
        update_fields=["status", "updated_at"]
    )

    record_membership_status_change(
        membership=membership,
        previous_status=previous_status,
        new_status=membership.status,
        reason="Member cancelled their leave request.",
        changed_by=membership.user,
    )

    return membership


@transaction.atomic
def deny_member_leave(*, membership, admin, reason):
    membership = (
        GroupMembership.objects.select_for_update()
        .select_related("group")
        .get(pk=membership.pk)
    )

    if not is_active_group_admin(
        group=membership.group,
        user=admin,
    ):
        raise ValueError(
            "Only an active group administrator can reject leave requests."
        )

    if membership.status != GroupMembership.Status.LEAVE_REQUESTED:
        raise ValueError(
            "This member does not have a pending leave request."
        )

    if not reason or not reason.strip():
        raise ValueError(
            "A rejection reason is required."
        )

    previous_status = membership.status

    membership.status = GroupMembership.Status.ACTIVE
    membership.save(
        update_fields=["status", "updated_at"]
    )

    record_membership_status_change(
        membership=membership,
        previous_status=previous_status,
        new_status=membership.status,
        reason=reason.strip(),
        changed_by=admin,
    )

    return membership


@transaction.atomic
def approve_member_leave(*, membership, admin):
    membership = (
        GroupMembership.objects.select_for_update()
        .select_related("group")
        .get(pk=membership.pk)
    )

    if not is_active_group_admin(
        group=membership.group,
        user=admin,
    ):
        raise ValueError(
            "Only an active group administrator can approve leave requests."
        )

    if membership.status != GroupMembership.Status.LEAVE_REQUESTED:
        raise ValueError(
            "This member does not have a pending leave request."
        )

    unfinished_cycles = list(
        Cycle.objects.select_for_update()
        .filter(
            group=membership.group,
            status=Cycle.Status.ACTIVE,
        )
    )

    if unfinished_cycles:
        raise ValueError(
            "This leave request can only be approved after the active cycle is completed."
        )

    draft_cycles = list(
        Cycle.objects.select_for_update()
        .filter(
            group=membership.group,
            status=Cycle.Status.DRAFT,
        ).order_by("-cycle_number")
    )

    for cycle in draft_cycles:
        cycle_membership_exists = CycleMembership.objects.filter(
            cycle=cycle,
            membership=membership,
        ).exists()

        if not cycle_membership_exists:
            continue

        if cycle.order_status != Cycle.OrderStatus.LOCKED:
            raise ValueError(
                "The member is part of a draft cycle whose order is not locked. "
                "Finalize or cancel the cycle before approving this leave request."
            )

        remove_member_from_cycle(
            cycle=cycle,
            membership=membership,
        )

    previous_status = membership.status

    membership.status = GroupMembership.Status.LEFT
    membership.save(
        update_fields=["status", "updated_at"]
    )

    record_membership_status_change(
        membership=membership,
        previous_status=previous_status,
        new_status=membership.status,
        reason="Administrator approved the member's leave request.",
        changed_by=admin,
    )

    return membership
