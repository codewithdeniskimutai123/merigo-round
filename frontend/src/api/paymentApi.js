
import api from './axios'

export const initiateContributionPayment = async (data) => {
  const response = await api.post(
    '/api/payments/contributions/initiate/',
    data
  )

  return response.data
}

export const getContributionPaymentStatus = async (transactionId) => {
  const response = await api.get(
    `/api/payments/transactions/${transactionId}/status/`
  )

  return response.data
}

