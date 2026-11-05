
from django.db.models import (
    Q,
    Case,
    When,
    Value,
    IntegerField,
    OuterRef,
    Subquery,
    CharField,
)
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from groups.models import Group, GroupMembership, Cycle, CycleMembership, CycleSwapRequest, Round
from groups.group_services import (
    create_group,
    add_member,
    cancel_join_request,
    activate_member,
    reject_member,
    update_group,
    delete_group,
    create_cycle,
    get_cycle_draw_options,
    select_cycle_draw_option,
    request_cycle_swap,
    accept_cycle_swap,
    reject_cycle_swap,
    finalize_cycle_order,
    create_cycle_rounds,
    activate_cycle,
    activate_next_round,
    CycleDrawOption)



from .serializers import (GroupSerializer, 
                          GroupMembershipSerializer,
                          MembershipStatusHistorySerializer,
                          CycleCreateSerializer,
                          CycleSerializer,
                          RoundSerializer
                          )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_list(request):

    user_membership = GroupMembership.objects.filter(
        group=OuterRef('pk'),
        user=request.user,
    )

    groups = Group.objects.exclude(
        status=Group.Status.ARCHIVED
    ).annotate(
        user_membership_status=Subquery(
            user_membership.values('status')[:1],
            output_field=CharField(),
        ),
        user_membership_role=Subquery(
            user_membership.values('role')[:1],
            output_field=CharField(),
        ),
    ).annotate(
        membership_priority=Case(
            When(
                user_membership_status=GroupMembership.Status.ACTIVE,
                then=Value(0),
            ),
            When(
                user_membership_status=GroupMembership.Status.PENDING,
                then=Value(1),
            ),
            default=Value(2),
            output_field=IntegerField(),
        )
    ).order_by(
        'membership_priority',
        '-created_at',
    )

    serializer = GroupSerializer(groups, many=True)

    return Response(
        serializer.data,
        status=status.HTTP_200_OK,
    )
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_detail(request, pk):

    group = get_object_or_404(
        Group.objects.exclude(
            status=Group.Status.ARCHIVED
        ),
        pk=pk,
    )

    membership = GroupMembership.objects.filter(
        group=group,
        user=request.user,
    ).first()

    group.user_membership_status = (
        membership.status if membership else None
    )

    group.user_membership_role = (
        membership.role if membership else None
    )

    serializer = GroupSerializer(group)

    return Response(
        serializer.data,
        status=status.HTTP_200_OK,
    )



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def group_create(request):
    if not request.user.is_profile_complete:
        return Response(
            {
                "detail": "Please complete your profile before creating a group."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = GroupSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    group = create_group(
        user=request.user,
        **serializer.validated_data,
    )

    group.user_membership_status = GroupMembership.Status.ACTIVE
    group.user_membership_role = GroupMembership.Role.ADMIN

    response_serializer = GroupSerializer(group)

    return Response(
        response_serializer.data,
        status=status.HTTP_201_CREATED,
    )

@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def group_update(request, pk):
    group = get_object_or_404(Group, pk=pk)

    serializer = GroupSerializer(
        group,
        data=request.data,
        partial=request.method == "PATCH",
    )

    serializer.is_valid(raise_exception=True)

    try:
        updated_group = update_group(
            user=request.user,
            group=group,
            **serializer.validated_data,
        )

        response_serializer = GroupSerializer(
            updated_group,
            context={"request": request},
        )

        return Response(response_serializer.data, status=status.HTTP_200_OK)

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def group_delete(request, pk):
    group = get_object_or_404(Group, pk=pk)

    try:
        delete_group(
            user=request.user,
            group=group,
        )

        return Response(status=status.HTTP_204_NO_CONTENT)

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def group_join_request(request, pk):
    if not request.user.is_profile_complete:
        return Response(
            {
                "detail": "Please complete your profile before requesting to join a group."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    group = get_object_or_404(
        Group.objects.exclude(status=Group.Status.ARCHIVED),
        pk=pk,
    )

    try:
        membership = add_member(
            user=request.user,
            group=group,
        )
    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Your join request has been submitted. Awaiting administrator approval.",
            "membership_id": membership.id,
            "status": membership.status,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def group_cancel_join_request(request, pk):
    group = get_object_or_404(
        Group.objects.exclude(status=Group.Status.ARCHIVED),
        pk=pk,
    )

    try:
        membership = cancel_join_request(
            user=request.user,
            group=group,
        )
    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Your join request has been cancelled.",
            "membership_id": membership.id,
            "status": membership.status,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def group_approve_member(request, pk, membership_id):
    group = get_object_or_404(
        Group.objects.exclude(status=Group.Status.ARCHIVED),
        pk=pk,
    )

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {"detail": "Only an active group administrator can approve join requests."},
            status=status.HTTP_403_FORBIDDEN,
        )

    membership = get_object_or_404(
        GroupMembership,
        pk=membership_id,
        group=group,
    )

    try:
        membership = activate_member(membership=membership)
    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Membership request approved successfully.",
            "membership_id": membership.id,
            "status": membership.status,
            "role": membership.role,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def group_reject_member(request, pk, membership_id):
    group = get_object_or_404(
        Group.objects.exclude(status=Group.Status.ARCHIVED),
        pk=pk,
    )

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {
                "detail": "Only an active group administrator can reject join requests."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    membership = get_object_or_404(
        GroupMembership,
        pk=membership_id,
        group=group,
    )

    reason = request.data.get("reason", "")

    if not isinstance(reason, str) or not reason.strip():
        return Response(
            {"reason": "A rejection reason is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        membership = reject_member(
            membership=membership,
            admin=request.user,
            reason=reason,
        )
    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Membership request rejected successfully.",
            "membership_id": membership.id,
            "status": membership.status,
            "reason": reason.strip(),
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_my_membership_history(request, pk):
    group = get_object_or_404(
        Group.objects.exclude(status=Group.Status.ARCHIVED),
        pk=pk,
    )

    membership = GroupMembership.objects.filter(
        group=group,
        user=request.user,
    ).first()

    if not membership:
        return Response(
            {
                "membership_status": None,
                "history": [],
            },
            status=status.HTTP_200_OK,
        )

    history = membership.status_history.all()

    serializer = MembershipStatusHistorySerializer(
        history,
        many=True,
    )

    return Response(
        {
            "membership_status": membership.status,
            "history": serializer.data,
        },
        status=status.HTTP_200_OK,
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_pending_members(request, pk):
    group = get_object_or_404(
        Group.objects.exclude(status=Group.Status.ARCHIVED),
        pk=pk,
    )

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {"detail": "Only active group administrators can view pending requests."},
            status=status.HTTP_403_FORBIDDEN,
        )

    pending_memberships = GroupMembership.objects.filter(
        group=group,
        status=GroupMembership.Status.PENDING,
    ).select_related("user").order_by("created_at")

    serializer = GroupMembershipSerializer(
        pending_memberships,
        many=True,
    )

    return Response(
        serializer.data,
        status=status.HTTP_200_OK,
    )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def group_members(request, pk):
    group = get_object_or_404(
        Group.objects.exclude(status=Group.Status.ARCHIVED),
        pk=pk,
    )

    is_active_member = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_active_member:
        return Response(
            {"detail": "Only active group members can view the members directory."},
            status=status.HTTP_403_FORBIDDEN,
        )

    members = GroupMembership.objects.filter(
        group=group,
        status=GroupMembership.Status.ACTIVE,
    ).select_related("user").order_by("joined_at")

    serializer = GroupMembershipSerializer(members, many=True)

    return Response(
        serializer.data,
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def group_cycles(request, pk):
    group = get_object_or_404(Group, pk=pk)
    is_active_member = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_active_member:
        return Response(
            {"detail": "Only active group members can view cycles."},
            status=status.HTTP_403_FORBIDDEN,
        )

    cycles = Cycle.objects.filter(
        group=group
    ).order_by("-cycle_number")

    serializer = CycleSerializer(cycles, many=True)

    return Response(
        serializer.data,
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def group_cycle_create(request, pk):

    group = get_object_or_404(Group, pk=pk)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {"detail": "Only an active group administrator can create a cycle."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = CycleCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        cycle = create_cycle(
            group=group,
            start_date=serializer.validated_data["start_date"],
            swap_deadline=serializer.validated_data["swap_deadline"],
        )

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    response_serializer = CycleSerializer(cycle)

    return Response(
        response_serializer.data,
        status=status.HTTP_201_CREATED,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_draw_options(request, pk, cycle_id):

    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group_id=pk,
    )

    membership = get_object_or_404(
        GroupMembership,
        group=cycle.group,
        user=request.user,
        status=GroupMembership.Status.ACTIVE,
    )

    try:
        draw_data = get_cycle_draw_options(
            cycle=cycle,
            membership=membership,
        )

        return Response(
            draw_data,
            status=status.HTTP_200_OK,
        )

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cycle_draw_select(request, pk, cycle_id):

    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group_id=pk,
    )

    membership = get_object_or_404(
        GroupMembership,
        group=cycle.group,
        user=request.user,
        status=GroupMembership.Status.ACTIVE,
    )

    token = request.data.get("token")

    if not token:
        return Response(
            {"token": "A draw option token is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = select_cycle_draw_option(
            cycle=cycle,
            membership=membership,
            token=token,
        )

        return Response(
            result,
            status=status.HTTP_200_OK,
        )

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cycle_swap_accept(request, pk, cycle_id, swap_id):
    cycle = get_object_or_404(Cycle, pk=cycle_id, group_id=pk)

    swap_request = get_object_or_404(
        CycleSwapRequest.objects.select_related("target__membership"),
        pk=swap_id,
        cycle=cycle,
    )

    if swap_request.target.membership.user_id != request.user.id:
        return Response(
            {"detail": "Only the member who received this request can accept it."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        swap_request = accept_cycle_swap(swap_request=swap_request)

        return Response(
            {
                "id": swap_request.id,
                "status": swap_request.status,
                "responded_at": swap_request.responded_at,
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cycle_swap_reject(request, pk, cycle_id, swap_id):
    cycle = get_object_or_404(Cycle, pk=cycle_id, group_id=pk)

    swap_request = get_object_or_404(
        CycleSwapRequest.objects.select_related("target__membership"),
        pk=swap_id,
        cycle=cycle,
    )

    if swap_request.target.membership.user_id != request.user.id:
        return Response(
            {"detail": "Only the member who received this request can reject it."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        swap_request = reject_cycle_swap(swap_request=swap_request)

        return Response(
            {
                "id": swap_request.id,
                "status": swap_request.status,
                "responded_at": swap_request.responded_at,
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cycle_order_finalize(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)
    cycle = get_object_or_404(Cycle, pk=cycle_id, group=group)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {"detail": "Only an active group admin can finalize the cycle order."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        cycle = finalize_cycle_order(cycle=cycle)

        return Response(
            {
                "id": cycle.id,
                "order_status": cycle.order_status,
                "detail": "The cycle order has been finalized.",
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cycle_rounds_create(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)
    cycle = get_object_or_404(Cycle, pk=cycle_id, group=group)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {"detail": "Only an active group admin can create cycle rounds."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        rounds = create_cycle_rounds(cycle=cycle)

        return Response(
            RoundSerializer(rounds, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cycle_activate(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)
    cycle = get_object_or_404(Cycle, pk=cycle_id, group=group)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {"detail": "Only an active group admin can activate a cycle."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        cycle = activate_cycle(cycle=cycle)

        return Response(
            {
                "id": cycle.id,
                "status": cycle.status,
                "detail": "The cycle has been activated.",
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cycle_next_round_activate(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)
    cycle = get_object_or_404(Cycle, pk=cycle_id, group=group)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {"detail": "Only an active group admin can activate the next round."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        next_round = activate_next_round(cycle=cycle)

        if next_round is None:
            return Response(
                {
                    "cycle_status": Cycle.Status.COMPLETED,
                    "detail": "All rounds have been completed. The cycle is now complete.",
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {
                "id": next_round.id,
                "cycle_id": next_round.cycle_id,
                "round_number": next_round.round_number,
                "recipient_id": next_round.recipient_id,
                "start_date": next_round.start_date,
                "due_date": next_round.due_date,
                "status": next_round.status,
                "detail": "The next round has been activated.",
            },
            status=status.HTTP_200_OK,
        )

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_rounds_list(request, pk, cycle_id):
    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group_id=pk,
    )

    is_cycle_member = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
    ).exists()

    if not is_cycle_member:
        return Response(
            {"detail": "You are not a member of this cycle."},
            status=status.HTTP_403_FORBIDDEN,
        )

    rounds = cycle.rounds.select_related(
        "recipient__user"
    ).order_by("round_number")

    return Response(
        RoundSerializer(rounds, many=True).data,
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_overview(request, pk, cycle_id):
    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group_id=pk,
    )

    cycle_memberships = CycleMembership.objects.filter(
        cycle=cycle
    ).select_related(
        "membership__user"
    ).order_by("id")

    if not cycle_memberships.filter(
        membership__user=request.user
    ).exists():
        return Response(
            {"detail": "You are not a member of this cycle."},
            status=status.HTTP_403_FORBIDDEN,
        )

    selected_membership_ids = set(
        CycleDrawOption.objects.filter(
            cycle=cycle,
            selected_by__isnull=False,
        ).values_list(
            "selected_by_id",
            flat=True,
        )
    )

    total_members = cycle_memberships.count()
    selected_count = len(selected_membership_ids)

    draw_complete = (
        cycle.order_status != Cycle.OrderStatus.PENDING
    )

    members = []

    for cycle_membership in cycle_memberships:
        member_data = GroupMembershipSerializer(
            cycle_membership.membership
        ).data

        member_data["has_selected"] = (
            cycle_membership.id in selected_membership_ids
        )

       
        if draw_complete:
            member_data["selected_number"] = (
                cycle_membership.selected_number
            )
            member_data["position"] = cycle_membership.position

        members.append(member_data)

    return Response({
        "cycle": CycleSerializer(cycle).data,
        "draw_progress": {
            "selected": selected_count,
            "total": total_members,
            "complete": draw_complete,
        },
        "swap_deadline": cycle.swap_deadline,
        "order_status": cycle.order_status,
        "members": members,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_order_details(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)

    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group=group,
    )

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        status=GroupMembership.Status.ACTIVE,
        role=GroupMembership.Role.ADMIN,
    ).exists()

    my_cycle_membership = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
    ).select_related(
        "membership__user"
    ).first()

    if not is_admin and not my_cycle_membership:
        return Response(
            {"detail": "You are not eligible to view this cycle."},
            status=status.HTTP_403_FORBIDDEN,
        )

    cycle_memberships = CycleMembership.objects.filter(
        cycle=cycle,
    ).select_related(
        "membership__user",
    )

    total_members = cycle_memberships.count()

    selected_count = CycleDrawOption.objects.filter(
        cycle=cycle,
        selected_by__isnull=False,
    ).count()

    draw_complete = (
        cycle.order_status != Cycle.OrderStatus.PENDING
    )

    response_data = {
        "cycle_id": cycle.id,
        "order_status": cycle.order_status,
        "swap_deadline": cycle.swap_deadline,
        "draw_complete": draw_complete,
        "total_members": total_members,
        "selected_count": selected_count,
        "remaining_count": total_members - selected_count,
        "is_admin": is_admin,
        "my_draw_status": {
            "membership_id": (
                my_cycle_membership.membership_id
                if my_cycle_membership
                else None
            ),
            "has_selected": (
                my_cycle_membership.selected_number is not None
                if my_cycle_membership
                else None
            ),
        },
        "members": [],
    }

    if draw_complete:
        ordered_members = cycle_memberships.order_by("position")

        response_data["members"] = [
            {
                "membership_id": item.membership_id,
                "username": item.membership.user.username,
                "first_name": item.membership.user.first_name,
                "last_name": item.membership.user.last_name,
                "selected_number": item.selected_number,
                "position": item.position,
            }
            for item in ordered_members
        ]

    return Response(response_data)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def cycle_swap_request(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)
    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group=group,
    )

    if request.method == "POST":
        requester = get_object_or_404(
            CycleMembership.objects.select_related("membership"),
            cycle=cycle,
            membership__user=request.user,
        )

        target_membership_id = request.data.get("target_membership_id")

        if not target_membership_id:
            return Response(
                {"target_membership_id": "A target member is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target = get_object_or_404(
            CycleMembership.objects.select_related("membership"),
            cycle=cycle,
            pk=target_membership_id,
        )

        try:
            swap_request = request_cycle_swap(
                requester=requester,
                target=target,
            )

            return Response(
                {
                    "id": swap_request.id,
                    "cycle_id": swap_request.cycle_id,
                    "requester_id": swap_request.requester_id,
                    "target_id": swap_request.target_id,
                    "status": swap_request.status,
                    "requested_at": swap_request.requested_at,
                },
                status=status.HTTP_201_CREATED,
            )

        except ValueError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # GET: Retrieve swap request history.

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        status=GroupMembership.Status.ACTIVE,
        role=GroupMembership.Role.ADMIN,
    ).exists()

    is_cycle_member = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
    ).exists()

    if not is_admin and not is_cycle_member:
        return Response(
            {"detail": "You are not eligible to view these swap requests."},
            status=status.HTTP_403_FORBIDDEN,
        )

    swap_requests = CycleSwapRequest.objects.filter(
        cycle=cycle,
    ).select_related(
        "requester__membership__user",
        "target__membership__user",
    )

    if not is_admin:
        swap_requests = swap_requests.filter(
            Q(requester__membership__user=request.user)
            | Q(target__membership__user=request.user)
        )

    swap_requests = swap_requests.order_by("-requested_at")

    response_data = [
        {
            "id": swap.id,
            "cycle_id": swap.cycle_id,
            "requester": {
                "membership_id": swap.requester.membership_id,
                "username": swap.requester.membership.user.username,
                "first_name": swap.requester.membership.user.first_name,
                "last_name": swap.requester.membership.user.last_name,
            },
            "target": {
                "membership_id": swap.target.membership_id,
                "username": swap.target.membership.user.username,
                "first_name": swap.target.membership.user.first_name,
                "last_name": swap.target.membership.user.last_name,
            },
            "status": swap.status,
            "requested_at": swap.requested_at,
            "responded_at": swap.responded_at,
        }
        for swap in swap_requests
    ]

    return Response(response_data, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_my_round(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)

    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group=group,
    )

    cycle_membership = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
    ).first()

    if not cycle_membership:
        return Response(
            {"detail": "You are not a member of this cycle."},
            status=status.HTTP_403_FORBIDDEN,
        )

    round_instance = cycle.rounds.filter(
        recipient=cycle_membership.membership,
    ).first()

    if not round_instance:
        return Response(
            {"detail": "Your round has not been created yet."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = RoundSerializer(round_instance)

    return Response(serializer.data)