
import api from './axios'

export async function getGroups() {
  const response = await api.get('/api/groups/')
  return response.data
}

export async function createGroup(groupData) {
  const response = await api.post(
    '/api/groups/create/',
    groupData,
  )

  return response.data
}

export async function getGroupById(groupId) {
  const response = await api.get(`/api/groups/${groupId}/`)
  return response.data
}

export async function getGroupMembers(groupId) {
  const response = await api.get(`/api/groups/${groupId}/members/`)
  return response.data
}


export async function requestToJoinGroup(groupId) {
  const response = await api.post(`/api/groups/${groupId}/join/`)
  return response.data
}


export async function cancelGroupJoinRequest(groupId) {
  const response = await api.post(`/api/groups/${groupId}/cancel-join/`)
  return response.data
}


export async function getPendingGroupMembers(groupId) {
  const response = await api.get(`/api/groups/${groupId}/pending-members/`)
  return response.data
}


export async function approveGroupMember(groupId, membershipId) {
  const response = await api.post(
    `/api/groups/${groupId}/members/${membershipId}/approve/`,
  )

  return response.data
}
