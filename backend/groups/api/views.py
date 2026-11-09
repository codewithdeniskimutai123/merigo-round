from django.conf import settings
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
import csv
from django.http import HttpResponse
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from groups.models import (Group, 
                        GroupMembership, 
                        Cycle, 
                        CycleMembership, 
                        CycleSwapRequest, 
                        Round, 
                        RoundDateChange,
                        MembershipStatusHistory,
                        Contribution,
                        Transaction,)
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
    CycleDrawOption,
    extend_round_due_date,
    archive_group,
    update_cycle,
    request_member_leave,
    cancel_member_leave_request,
    approve_member_leave,
    deny_member_leave,
    remove_member_from_cycle)

from groups.services import initiate_contribution_payment, waive_contribution


from .serializers import (GroupSerializer, 
                          GroupMembershipSerializer,
                          MembershipStatusHistorySerializer,
                          CycleCreateSerializer,
                          CycleSerializer,
                          RoundSerializer,
                          RoundDateChangeSerializer,
                          RoundDateExtensionSerializer,
                          CycleUpdateSerializer,
                          ContributionSerializer,
                          ContributionPaymentInitiationSerializer,
                          TransactionSerializer,
                          ContributionWaiverSerializer,
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



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def group_leave_request(request, pk):
    group = get_object_or_404(Group, pk=pk)

    membership = get_object_or_404(
        GroupMembership,
        group=group,
        user=request.user,
    )

    try:
        membership = request_member_leave(
            membership=membership,
        )
    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Your leave request has been submitted.",
            "membership": GroupMembershipSerializer(membership).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def group_cancel_leave_request(request, pk):
    group = get_object_or_404(Group, pk=pk)

    membership = get_object_or_404(
        GroupMembership,
        group=group,
        user=request.user,
    )

    try:
        membership = cancel_member_leave_request(
            membership=membership,
        )
    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Your leave request has been cancelled.",
            "membership": GroupMembershipSerializer(membership).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def group_pending_leave_requests(request, pk):
    group = get_object_or_404(Group, pk=pk)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {
                "detail": "Only active group administrators can view leave requests."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    memberships = GroupMembership.objects.filter(
        group=group,
        status=GroupMembership.Status.LEAVE_REQUESTED,
    ).select_related("user").order_by("updated_at")

    return Response(
        GroupMembershipSerializer(memberships, many=True).data,
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def group_approve_leave_request(request, pk, membership_id):
    group = get_object_or_404(Group, pk=pk)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {
                "detail": "Only active group administrators can approve leave requests."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    membership = get_object_or_404(
        GroupMembership,
        pk=membership_id,
        group=group,
    )

    try:
        membership = approve_member_leave(
            membership=membership,
            admin=request.user,
        )
    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Leave request approved successfully.",
            "membership": GroupMembershipSerializer(membership).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def group_reject_leave_request(request, pk, membership_id):
    group = get_object_or_404(Group, pk=pk)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {
                "detail": "Only active group administrators can reject leave requests."
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
        membership = deny_member_leave(
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
            "detail": "Leave request rejected successfully.",
            "reason": reason.strip(),
            "membership": GroupMembershipSerializer(membership).data,
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



@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def cycle_update(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)

    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group=group,
    )

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {"detail": "Only active group administrators can edit a cycle."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = CycleUpdateSerializer(
        cycle,
        data=request.data,
        partial=request.method == "PATCH",
    )

    serializer.is_valid(raise_exception=True)

    try:
        updated_cycle = update_cycle(
            cycle=cycle,
            **serializer.validated_data,
        )

    except ValueError as error:
        return Response(
            {"detail": str(error)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Cycle updated successfully.",
            "cycle": CycleSerializer(updated_cycle).data,
        },
        status=status.HTTP_200_OK,
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

    is_group_admin = GroupMembership.objects.filter(
        group_id=pk,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    is_cycle_member = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
        membership__status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_group_admin and not is_cycle_member:
        return Response(
            {"detail": "You are not authorized to view these cycle rounds."},
            status=status.HTTP_403_FORBIDDEN,
        )

    rounds = cycle.rounds.select_related(
        "recipient__user"
    ).order_by("round_number")

    serializer = RoundSerializer(rounds, many=True)

    return Response(
        serializer.data,
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

    is_group_admin = GroupMembership.objects.filter(
        group_id=pk,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    cycle_memberships = CycleMembership.objects.filter(
        cycle=cycle,
        membership__status=GroupMembership.Status.ACTIVE,
    ).select_related(
        "membership__user"
    ).order_by("id")

    my_cycle_membership = cycle_memberships.filter(
        membership__user=request.user
    ).first()

    if not is_group_admin and my_cycle_membership is None:
        return Response(
            {"detail": "You are not authorized to view this cycle."},
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
        cycle.order_status == Cycle.OrderStatus.LOCKED
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
            member_data["position"] = (
                cycle_membership.position
            )

        members.append(member_data)

    return Response(
        {
            "cycle": CycleSerializer(cycle).data,
            "draw_progress": {
                "selected": selected_count,
                "total": total_members,
                "complete": draw_complete,
            },
            "swap_deadline": cycle.swap_deadline,
            "order_status": cycle.order_status,
            "is_admin": is_group_admin,
            "my_cycle_membership_id": (
                my_cycle_membership.id
                if my_cycle_membership
                else None
            ),
            "members": members,
        },
        status=status.HTTP_200_OK,
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_order_details(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)
    cycle = get_object_or_404(Cycle, pk=cycle_id, group=group)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    cycle_membership = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
        membership__status=GroupMembership.Status.ACTIVE,
    ).first()

    if not is_admin and not cycle_membership:
        return Response(
            {"detail": "You do not have permission to view this cycle order."},
            status=status.HTTP_403_FORBIDDEN,
        )

    draw_complete = cycle.order_status == Cycle.OrderStatus.LOCKED

    members = []

    if draw_complete:
        cycle_memberships = CycleMembership.objects.filter(
            cycle=cycle,
            membership__status=GroupMembership.Status.ACTIVE,
        ).select_related(
            "membership__user"
        ).order_by("position")

        members = [
            {
                "cycle_membership_id": item.id,
                "membership_id": item.membership_id,
                "user_id": item.membership.user_id,
                "username": item.membership.user.username,
                "position": item.position,
                "selected_number": item.selected_number,
            }
            for item in cycle_memberships
        ]

    return Response({
        "cycle": CycleSerializer(cycle).data,
        "draw_complete": draw_complete,
        "order_status": cycle.order_status,
        "members": members,
    })

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def cycle_swap_request(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)
    cycle = get_object_or_404(Cycle, pk=cycle_id, group=group)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if request.method == "POST":
        requester = CycleMembership.objects.filter(
            cycle=cycle,
            membership__user=request.user,
            membership__status=GroupMembership.Status.ACTIVE,
        ).first()

        if not requester:
            return Response(
                {"detail": "You must be an active group member in this cycle to request a swap."},
                status=status.HTTP_403_FORBIDDEN,
            )

        target_id = request.data.get("target_id")

        if not target_id:
            return Response(
                {"detail": "A target member is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target = get_object_or_404(
            CycleMembership,
            pk=target_id,
            cycle=cycle,
            membership__status=GroupMembership.Status.ACTIVE,
        )

        try:
            swap_request = request_cycle_swap(
                requester=requester,
                target=target,
            )
        except ValueError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Position swap request submitted successfully.",
                "swap_request": {
                    "id": swap_request.id,
                    "requester": swap_request.requester_id,
                    "target": swap_request.target_id,
                    "status": swap_request.status,
                    "requested_at": swap_request.requested_at,
                },
            },
            status=status.HTTP_201_CREATED,
        )

    if not is_admin:
        is_cycle_member = CycleMembership.objects.filter(
            cycle=cycle,
            membership__user=request.user,
            membership__status=GroupMembership.Status.ACTIVE,
        ).exists()

        if not is_cycle_member:
            return Response(
                {"detail": "You do not have permission to view these swap requests."},
                status=status.HTTP_403_FORBIDDEN,
            )

    swaps = CycleSwapRequest.objects.filter(
        cycle=cycle,
    ).select_related(
        "requester__membership__user",
        "target__membership__user",
    ).order_by("-requested_at")

    if not is_admin:
        swaps = swaps.filter(
            Q(requester__membership__user=request.user)
            | Q(target__membership__user=request.user)
        )

    data = [
        {
            "id": swap.id,
            "requester": swap.requester_id,
            "requester_username": swap.requester.membership.user.username,
            "requester_position": swap.requester.position,
            "target": swap.target_id,
            "target_username": swap.target.membership.user.username,
            "target_position": swap.target.position,
            "status": swap.status,
            "requested_at": swap.requested_at,
            "responded_at": swap.responded_at,
        }
        for swap in swaps
    ]

    return Response(data, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_my_round(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)
    cycle = get_object_or_404(Cycle, pk=cycle_id, group=group)

    cycle_membership = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
        membership__status=GroupMembership.Status.ACTIVE,
    ).first()

    if not cycle_membership:
        return Response(
            {"detail": "You are not an active member of this cycle."},
            status=status.HTTP_404_NOT_FOUND,
        )

    round_obj = Round.objects.filter(
        cycle=cycle,
        recipient=cycle_membership.membership,
    ).first()

    if not round_obj:
        return Response(
            {"detail": "Your round has not been created yet."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        RoundSerializer(round_obj).data,
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def cycle_round_extend_date(request, cycle_id, round_id):
    cycle = get_object_or_404(
        Cycle.objects.select_related("group"),
        pk=cycle_id,
    )

    if not GroupMembership.objects.filter(
        group=cycle.group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists():
        return Response(
            {"detail": "Only active group administrators can extend round dates."},
            status=status.HTTP_403_FORBIDDEN,
        )

    round_obj = get_object_or_404(
        Round,
        pk=round_id,
        cycle=cycle,
    )

    serializer = RoundDateExtensionSerializer(
        data=request.data,
        context={"round_obj": round_obj},
    )

    serializer.is_valid(raise_exception=True)

    try:
        updated_rounds = extend_round_due_date(
            round_obj=round_obj,
            new_due_date=serializer.validated_data["new_due_date"],
            reason=serializer.validated_data["reason"],
            changed_by=request.user,
        )

    except ValueError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Round dates extended successfully.",
            "updated_rounds": RoundSerializer(
                updated_rounds,
                many=True,
            ).data,
        },
        status=status.HTTP_200_OK,
    )




@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_round_date_history(request, cycle_id, round_id):

    cycle = get_object_or_404(
        Cycle.objects.select_related("group"),
        pk=cycle_id,
    )

    is_admin = GroupMembership.objects.filter(
        group=cycle.group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    is_cycle_member = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
        membership__status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin and not is_cycle_member:
        return Response(
            {"detail": "You are not authorized to view this round's date history."},
            status=status.HTTP_403_FORBIDDEN,
        )

    round_obj = get_object_or_404(
        Round,
        pk=round_id,
        cycle=cycle,
    )

    history = (
        RoundDateChange.objects
        .filter(round=round_obj)
        .select_related("changed_by")
        .order_by("-created_at")
    )

    serializer = RoundDateChangeSerializer(history, many=True)

    return Response(serializer.data, status=status.HTTP_200_OK)



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def group_remove_member(request, group_id, membership_id):
    group = get_object_or_404(Group, pk=group_id)

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {"detail": "Only an active group admin can remove members."},
            status=status.HTTP_403_FORBIDDEN,
        )

    membership = get_object_or_404(
        GroupMembership,
        pk=membership_id,
        group=group,
    )

    if membership.role == GroupMembership.Role.ADMIN:
        return Response(
            {"detail": "The group admin cannot be removed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if membership.status != GroupMembership.Status.ACTIVE:
        return Response(
            {"detail": "Only active members can be removed."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    reason = request.data.get("reason", "").strip()

    if not reason:
        return Response(
            {"detail": "Please provide a reason for removing this member."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        with transaction.atomic():
            active_cycle_exists = CycleMembership.objects.filter(
                membership=membership,
                cycle__group=group,
                cycle__status=Cycle.Status.ACTIVE,
            ).exists()

            if active_cycle_exists:
                raise ValueError(
                    "This member cannot be removed while they belong to an active cycle."
                )

            draft_cycle_memberships = CycleMembership.objects.filter(
                membership=membership,
                cycle__group=group,
                cycle__status=Cycle.Status.DRAFT,
            ).select_related("cycle")

            for cycle_membership in draft_cycle_memberships:
                cycle = cycle_membership.cycle

                if cycle.order_status != Cycle.OrderStatus.LOCKED:
                    raise ValueError(
                        "The member cannot be removed while a draft cycle's order is not locked."
                    )

                has_swap_history = CycleSwapRequest.objects.filter(
                    Q(requester=cycle_membership)
                    | Q(target=cycle_membership)
                ).exists()

                if has_swap_history:
                    raise ValueError(
                        "This member cannot be removed from the cycle because swap request history references their cycle membership."
                    )

                remove_member_from_cycle(
                    cycle=cycle,
                    membership=membership,
                )

            previous_status = membership.status

            membership.status = GroupMembership.Status.REMOVED
            membership.save(update_fields=["status", "updated_at"])

            MembershipStatusHistory.objects.create(
                membership=membership,
                previous_status=previous_status,
                new_status=GroupMembership.Status.REMOVED,
                reason=reason,
                changed_by=request.user,
            )

    except ValueError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {"message": "Member removed successfully."},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def group_archive(request, group_id):
    group = get_object_or_404(Group, pk=group_id)

    try:
        archive_group(
            user=request.user,
            group=group,
        )
    except ValueError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {"message": "Group archived successfully."},
        status=status.HTTP_200_OK,
    )




@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_contributions_list(request, pk, cycle_id):
    group = get_object_or_404(
        Group,
        pk=pk,
    )

    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group=group,
    )

    # Check whether the user is an active group administrator.
    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    # Check whether the user belongs to this cycle.
    cycle_membership = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
        membership__status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin and not cycle_membership:
        return Response(
            {
                "detail": "You are not authorized to view these contributions."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    contributions = Contribution.objects.filter(
        round__cycle=cycle,
    ).select_related(
        "member__user",
        "round",
        "round__cycle",
        "round__cycle__group",
    )

    # Ordinary members can only see their own contributions.
    if not is_admin:
        contributions = contributions.filter(
            member__user=request.user,
        )

    # Optional status filter.
    selected_status = request.query_params.get("status")

    valid_statuses = dict(Contribution.Status.choices)

    if selected_status and selected_status != "all":
        if selected_status not in valid_statuses:
            return Response(
                {
                    "detail": "Invalid contribution status.",
                    "valid_statuses": list(valid_statuses.keys()),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        contributions = contributions.filter(
            status=selected_status,
        )

    # Optional member search (primarily useful for administrators).
    search = request.query_params.get("search", "").strip()

    if search and is_admin:
        contributions = contributions.filter(
            Q(member__user__first_name__icontains=search)
            | Q(member__user__last_name__icontains=search)
            | Q(member__user__username__icontains=search)
            | Q(member__user__email__icontains=search)
        )

    contributions = contributions.order_by(
        "round__round_number",
        "member__user__first_name",
        "member__user__last_name",
    )

    serializer = ContributionSerializer(
        contributions,
        many=True,
    )

    return Response(
        {
            "group_name": group.name,
            "cycle_id": cycle.id,
            "total_contributions": contributions.count(),
            "contributions": serializer.data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def contribution_payment_initiate(request):
    serializer = ContributionPaymentInitiationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    contribution_id = serializer.validated_data["contribution_id"]
    phone_number = serializer.validated_data["phone_number"]
    amount = serializer.validated_data["amount"]

    contribution = get_object_or_404(
        Contribution.objects.select_related("member__user"),
        id=contribution_id,
        member__user=request.user,
    )

    callback_url = settings.MPESA_CALLBACK_URL

    if not callback_url:
        return Response(
            {"detail": "M-Pesa callback URL is not configured."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    try:
        payment = initiate_contribution_payment(
            contribution_id=contribution.id,
            phone_number=phone_number,
            amount=amount,
            callback_url=callback_url,
        )
    except ValueError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )
    except RuntimeError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(
        {
            "message": (
                "M-Pesa payment request initiated. "
                "Check your phone to complete payment."
            ),
            "transaction": TransactionSerializer(payment).data,
        },
        status=status.HTTP_202_ACCEPTED,
    )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def contribution_waive(request, pk, cycle_id, contribution_id):
    group = get_object_or_404(Group, pk=pk)

    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group=group,
    )

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin:
        return Response(
            {"detail": "Only active group administrators can waive contributions."},
            status=status.HTTP_403_FORBIDDEN,
        )

    contribution = get_object_or_404(
        Contribution.objects.select_related(
            "member__user",
            "round",
        ),
        pk=contribution_id,
        round__cycle=cycle,
    )

    serializer = ContributionWaiverSerializer(
        data=request.data,
    )
    serializer.is_valid(raise_exception=True)

    try:
        contribution = waive_contribution(
            contribution_id=contribution.id,
            amount=serializer.validated_data["amount"],
            admin_user=request.user,
            reason=serializer.validated_data["reason"],
        )

    except ValueError as exc:
        return Response(
            {"detail": str(exc)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(
        {
            "detail": "Contribution waiver applied successfully.",
            "contribution": ContributionSerializer(contribution).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def contribution_payment_status(request, transaction_id):
    payment = get_object_or_404(
        Transaction.objects.select_related("contribution__member__user"),
        id=transaction_id,
        contribution__member__user=request.user,
    )

    return Response(
        TransactionSerializer(payment).data,
        status=status.HTTP_200_OK,
    )



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_payment_history(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)

    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group=group,
    )

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    is_cycle_member = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
        membership__status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin and not is_cycle_member:
        return Response(
            {"detail": "You are not authorized to view these payments."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Determine whose payment history should be displayed.
    scope = request.query_params.get("scope", "all").lower()

    if scope not in ["all", "mine"]:
        return Response(
            {"detail": "Invalid payment history scope."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Only administrators can request all members' transactions.
    if scope == "all" and not is_admin:
        scope = "mine"

    payments = Transaction.objects.filter(
        contribution__round__cycle=cycle,
    ).select_related(
        "contribution",
        "contribution__member__user",
        "contribution__round",
    )

    if scope == "mine":
        payments = payments.filter(
            contribution__member__user=request.user,
        )

    selected_status = request.query_params.get("status")

    valid_statuses = dict(Transaction.Status.choices)

    if selected_status and selected_status != "all":
        if selected_status not in valid_statuses:
            return Response(
                {"detail": "Invalid payment status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payments = payments.filter(status=selected_status)

    payments = payments.order_by("-created_at")

    payment_data = []

    for payment in payments:
        member = payment.contribution.member
        user = member.user

        payment_item = TransactionSerializer(payment).data

        payment_item.update({
            "member_id": member.id,
            "member_name": user.get_full_name() or user.username,
            "username": user.username,
            "round_number": payment.contribution.round.round_number,
        })

        payment_data.append(payment_item)

    return Response(
        {
            "group_name": group.name,
            "cycle_id": cycle.id,
            "scope": scope,
            "total_payments": len(payment_data),
            "payments": payment_data,
        },
        status=status.HTTP_200_OK,
    )




@api_view(["GET"])
@permission_classes([IsAuthenticated])
def cycle_payment_history_download(request, pk, cycle_id):
    group = get_object_or_404(Group, pk=pk)

    cycle = get_object_or_404(
        Cycle,
        pk=cycle_id,
        group=group,
    )

    is_admin = GroupMembership.objects.filter(
        group=group,
        user=request.user,
        role=GroupMembership.Role.ADMIN,
        status=GroupMembership.Status.ACTIVE,
    ).exists()

    is_cycle_member = CycleMembership.objects.filter(
        cycle=cycle,
        membership__user=request.user,
        membership__status=GroupMembership.Status.ACTIVE,
    ).exists()

    if not is_admin and not is_cycle_member:
        return Response(
            {"detail": "You are not authorized to download these payments."},
            status=status.HTTP_403_FORBIDDEN,
        )

    # Determine whose payment history should be downloaded.
    scope = request.query_params.get("scope", "all").lower()

    if scope not in ["all", "mine"]:
        return Response(
            {"detail": "Invalid payment history scope."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Ordinary members can only download their own transactions.
    if scope == "all" and not is_admin:
        scope = "mine"

    payments = Transaction.objects.filter(
        contribution__round__cycle=cycle,
    ).select_related(
        "contribution",
        "contribution__member__user",
        "contribution__round",
    )

    if scope == "mine":
        payments = payments.filter(
            contribution__member__user=request.user,
        )

    selected_status = request.query_params.get("status")

    valid_statuses = dict(Transaction.Status.choices)

    if selected_status and selected_status != "all":
        if selected_status not in valid_statuses:
            return Response(
                {"detail": "Invalid payment status."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payments = payments.filter(status=selected_status)

    payments = payments.order_by("-created_at")

    response = HttpResponse(
        content_type="text/csv",
    )

    response["Content-Disposition"] = (
        f'attachment; filename="payment_history_cycle_{cycle.id}_{scope}.csv"'
    )

    writer = csv.writer(response)

    writer.writerow([
        "Member",
        "Username",
        "Round",
        "Amount",
        "Phone Number",
        "M-Pesa Receipt",
        "Status",
        "Transaction Date",
        "Created At",
    ])

    for payment in payments:
        user = payment.contribution.member.user

        writer.writerow([
            user.get_full_name() or user.username,
            user.username,
            payment.contribution.round.round_number,
            payment.amount,
            payment.phone_number,
            payment.mpesa_receipt_number or "",
            payment.status,
            payment.transaction_date or "",
            payment.created_at,
        ])

    return response
