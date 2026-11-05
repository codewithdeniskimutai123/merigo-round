import api from './axios'


export async function getGroupCycles(groupId) {
  const response = await api.get(
    `/api/groups/${groupId}/cycles/`,
  )

  return response.data
}

export async function createCycle(groupId, cycleData) {
  const response = await api.post(
    `/api/groups/${groupId}/cycles/create/`,
    cycleData,
  )

  return response.data
}


export async function getCycleDrawOptions(groupId, cycleId) {
  const response = await api.get(
    `/api/groups/${groupId}/cycles/${cycleId}/draw/options/`,
  )

  return response.data
}


export async function selectCycleDrawOption(groupId, cycleId, token) {
  const response = await api.post(
    `/api/groups/${groupId}/cycles/${cycleId}/draw/select/`,
    { token },
  )

  return response.data
}


export async function getCycleOrderDetails(groupId, cycleId) {
  const response = await api.get(
    `/api/groups/${groupId}/cycles/${cycleId}/order/`,
  )

  return response.data
}

export async function finalizeCycleOrder(groupId, cycleId) {
  const response = await api.post(
    `/api/groups/${groupId}/cycles/${cycleId}/finalize-order/`,
  )

  return response.data
}


export async function getCycleSwapRequests(groupId, cycleId) {
  const response = await api.get(
    `/api/groups/${groupId}/cycles/${cycleId}/swaps/`,
  )

  return response.data
}

export async function requestCycleSwap(groupId, cycleId, targetMembershipId) {
  const response = await api.post(
    `/api/groups/${groupId}/cycles/${cycleId}/swaps/`,
    { target_membership_id: targetMembershipId },
  )

  return response.data
}

export async function acceptCycleSwap(groupId, cycleId, swapId) {
  const response = await api.post(
    `/api/groups/${groupId}/cycles/${cycleId}/swaps/${swapId}/accept/`,
  )

  return response.data
}

export async function rejectCycleSwap(groupId, cycleId, swapId) {
  const response = await api.post(
    `/api/groups/${groupId}/cycles/${cycleId}/swaps/${swapId}/reject/`,
  )

  return response.data
}


export async function createCycleRounds(groupId, cycleId) {
  const response = await api.post(
    `/api/groups/${groupId}/cycles/${cycleId}/rounds/create/`,
  )

  return response.data
}

export async function getCycleRounds(groupId, cycleId) {
  const response = await api.get(
    `/api/groups/${groupId}/cycles/${cycleId}/rounds/`,
  )

  return response.data
}

export async function getMyCycleRound(groupId, cycleId) {
  const response = await api.get(
    `/api/groups/${groupId}/cycles/${cycleId}/my-round/`,
  )

  return response.data
}



export async function activateCycle(groupId, cycleId) {
  const response = await api.post(
    `/api/groups/${groupId}/cycles/${cycleId}/activate/`,
  )

  return response.data
}

export async function activateNextRound(groupId, cycleId) {
  const response = await api.post(
    `/api/groups/${groupId}/cycles/${cycleId}/rounds/activate-next/`,
  )

  return response.data
}