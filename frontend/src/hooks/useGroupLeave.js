
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  requestGroupLeave,
  cancelGroupLeaveRequest,
  getPendingGroupLeaveRequests,
  approveGroupLeaveRequest,
  rejectGroupLeaveRequest,
} from '../api/groupLeaveApi'

// ==================================================
// ERROR HANDLING
// ==================================================

function getErrorMessage(error, fallback) {
  const responseData = error.response?.data

  if (responseData?.detail) {
    return responseData.detail
  }

  if (responseData && typeof responseData === 'object') {
    return Object.values(responseData)
      .flat()
      .filter(Boolean)
      .join(' ')
  }

  return fallback
}

// ==================================================
// QUERY INVALIDATION
// ==================================================

function invalidateLeaveQueries(queryClient, groupId) {
  queryClient.invalidateQueries({
    queryKey: ['group', groupId],
  })

  queryClient.invalidateQueries({
    queryKey: ['group', groupId, 'members'],
  })

  queryClient.invalidateQueries({
    queryKey: ['group', groupId, 'pending-members'],
  })

  queryClient.invalidateQueries({
    queryKey: ['group', groupId, 'leave-requests'],
  })

  queryClient.invalidateQueries({
    queryKey: ['group', groupId, 'membership-history'],
  })

  queryClient.invalidateQueries({
    queryKey: ['my-groups'],
  })
}

// ==================================================
// PENDING LEAVE REQUESTS QUERY
// ==================================================

export function usePendingGroupLeaveRequests(groupId, enabled = true) {
  return useQuery({
    queryKey: ['group', groupId, 'leave-requests'],
    queryFn: () => getPendingGroupLeaveRequests(groupId),
    enabled: Boolean(groupId) && enabled,
  })
}

// ==================================================
// MEMBER REQUESTS TO LEAVE
// ==================================================

export function useRequestGroupLeave(groupId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => requestGroupLeave(groupId),

    onSuccess: () => {
      invalidateLeaveQueries(queryClient, groupId)

      toast.success('Your request to leave the group has been submitted.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Unable to submit your leave request.'
        )
      )
    },
  })
}

// ==================================================
// MEMBER CANCELS LEAVE REQUEST
// ==================================================

export function useCancelGroupLeaveRequest(groupId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => cancelGroupLeaveRequest(groupId),

    onSuccess: () => {
      invalidateLeaveQueries(queryClient, groupId)

      toast.success('Your leave request has been cancelled.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Unable to cancel your leave request.'
        )
      )
    },
  })
}

// ==================================================
// ADMIN APPROVES LEAVE REQUEST
// ==================================================

export function useApproveGroupLeaveRequest(groupId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (membershipId) =>
      approveGroupLeaveRequest(groupId, membershipId),

    onSuccess: () => {
      invalidateLeaveQueries(queryClient, groupId)

      toast.success('Member leave request approved successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Unable to approve the member leave request.'
        )
      )
    },
  })
}

// ==================================================
// ADMIN REJECTS LEAVE REQUEST
// ==================================================

export function useRejectGroupLeaveRequest(groupId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ membershipId, reason }) =>
      rejectGroupLeaveRequest(groupId, membershipId, reason),

    onSuccess: () => {
      invalidateLeaveQueries(queryClient, groupId)

      toast.success('Member leave request rejected successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          'Unable to reject the member leave request.'
        )
      )
    },
  })
}
