import api from './axios'

export const getCycleContributions = async (groupId, cycleId, params = {}) => {
  const response = await api.get(
    `/api/groups/${groupId}/cycles/${cycleId}/contributions/`,
    { params }
  )

  return response.data
}

export const getCyclePaymentHistory = async (groupId, cycleId, params = {}) => {
  const response = await api.get(
    `/api/groups/${groupId}/cycles/${cycleId}/payments/`,
    { params }
  )

  return response.data
}

export const downloadCyclePaymentHistory = async (
  groupId,
  cycleId,
  params = {}
) => {
  const response = await api.get(
    `/api/groups/${groupId}/cycles/${cycleId}/payments/download/`,
    {
      params,
      responseType: 'blob',
    }
  )

  return response.data
}


export const waiveContribution = async ({
  groupId,
  cycleId,
  contributionId,
  amount,
  reason,
}) => {
  const response = await api.post(
    `/api/groups/${groupId}/cycles/${cycleId}/contributions/${contributionId}/waive/`,
    {
      amount,
      reason,
    }
  )

  return response.data
}
