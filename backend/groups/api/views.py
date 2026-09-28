from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from groups.models import Group
from .serializers import GroupSerializer

@api_view(['GET', 'POST'])
@permission_classes(IsAuthenticated)

def group_list(request):
    groups = Group.objects.all()
    serializer = GroupSerializer(groups, many=True)

    return Response(serializer.data, status=status.HTTP_200_OK)