
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getGroups,
  getGroupById,
  createGroup,
  getGroupMembers,
  requestToJoinGroup,
  cancelGroupJoinRequest,
  getPendingGroupMembers,
  approveGroupMember,
} from '../api/groupApi'

function getErrorMessage(error, fallback) {
  const responseData = error.response?.data

  if (responseData?.detail) {
    return responseData.detail
  }

  if (responseData && typeof responseData === 'object') {
    return Object.values(responseData).flat().join(' ')
  }

  return fallback
}

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: getGroups,
  })
}

export function useGroup(groupId) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroupById(groupId),
    enabled: Boolean(groupId),
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createGroup,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['groups'],
      })

      toast.success('Group created successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to create group. Please try again.'),
      )
    },
  })
}

export function useGroupMembers(groupId, enabled = true) {
  return useQuery({
    queryKey: ['group', groupId, 'members'],
    queryFn: () => getGroupMembers(groupId),
    enabled: Boolean(groupId) && enabled,
  })
}

export function usePendingGroupMembers(groupId, enabled = true) {
  return useQuery({
    queryKey: ['group', groupId, 'pending-members'],
    queryFn: () => getPendingGroupMembers(groupId),
    enabled: Boolean(groupId) && enabled,
  })
}

export function useRequestToJoinGroup(groupId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => requestToJoinGroup(groupId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group', groupId],
      })

      queryClient.invalidateQueries({
        queryKey: ['groups'],
      })

      toast.success('Your membership request has been submitted.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to submit your membership request.'),
      )
    },
  })
}

export function useCancelGroupJoinRequest(groupId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => cancelGroupJoinRequest(groupId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group', groupId],
      })

      queryClient.invalidateQueries({
        queryKey: ['groups'],
      })

      toast.success('Your membership request has been cancelled.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to cancel your membership request.'),
      )
    },
  })
}

export function useApproveGroupMember(groupId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (membershipId) =>
      approveGroupMember(groupId, membershipId),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group', groupId],
      })

      queryClient.invalidateQueries({
        queryKey: ['group', groupId, 'pending-members'],
      })

      queryClient.invalidateQueries({
        queryKey: ['group', groupId, 'members'],
      })

      queryClient.invalidateQueries({
        queryKey: ['groups'],
      })

      toast.success('Member approved successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to approve this member.'),
      )
    },
  })
}
