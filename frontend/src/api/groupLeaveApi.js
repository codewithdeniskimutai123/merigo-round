
import api from './axios'

// ==================================================
// MEMBER LEAVE REQUESTS
// ==================================================

export async function requestGroupLeave(groupId) {
  const response = await api.post(
    `/api/groups/${groupId}/leave-request/`
  )
  return response.data
}

export async function cancelGroupLeaveRequest(groupId) {
  const response = await api.post(
    `/api/groups/${groupId}/leave-request/cancel/`
  )
  return response.data
}

export async function getPendingGroupLeaveRequests(groupId) {
  const response = await api.get(
    `/api/groups/${groupId}/leave-requests/`
  )
  return response.data
}

export async function approveGroupLeaveRequest(groupId, membershipId) {
  const response = await api.post(
    `/api/groups/${groupId}/members/${membershipId}/leave/approve/`
  )
  return response.data
}

export async function rejectGroupLeaveRequest(
  groupId,
  membershipId,
  reason
) {
  const response = await api.post(
    `/api/groups/${groupId}/members/${membershipId}/leave/reject/`,
    { reason }
  )
  return response.data
}
