
from django.db.models import (
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

from groups.models import Group, GroupMembership
from groups.group_services import (
    create_group,
    add_member,
    cancel_join_request,
    activate_member,
)
from .serializers import GroupSerializer, GroupMembershipSerializer


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