
import { useMutation, useQuery} from '@tanstack/react-query'
import {
  initiateContributionPayment,
  getContributionPaymentStatus,
} from '../api/paymentApi'

export const useInitiateContributionPayment = () => {
  return useMutation({
    mutationFn: initiateContributionPayment,
  })
}

export const useContributionPaymentStatus = (transactionId, enabled = true) => {
  return useQuery({
    queryKey: ['contribution-payment-status', transactionId],
    queryFn: () => getContributionPaymentStatus(transactionId),
    enabled: Boolean(transactionId && enabled),
    refetchInterval: (query) => {
      const status = query.state.data?.status

      return status === 'PENDING' ? 3000 : false
    },
    retry: 1,
    refetchOnWindowFocus: true,
  })
}

