import { useQuery, useMutation, useQueryClient  } from '@tanstack/react-query'

import {
  getCycleContributions,
  getCyclePaymentHistory,
  downloadCyclePaymentHistory,
   waiveContribution,
} from '../api/contributionApi'

export const useCycleContributions = (groupId, cycleId, params = {}) => {
  return useQuery({
    queryKey: ['cycle-contributions', groupId, cycleId, params],
    queryFn: () => getCycleContributions(groupId, cycleId, params),
    enabled: Boolean(groupId && cycleId),
    retry: 1,
  })
}

export const useCyclePaymentHistory = (groupId, cycleId, params = {}) => {
  return useQuery({
    queryKey: ['cycle-payment-history', groupId, cycleId, params],
    queryFn: () => getCyclePaymentHistory(groupId, cycleId, params),
    enabled: Boolean(groupId && cycleId),
    retry: 1,
  })
}

export const useDownloadCyclePaymentHistory = () => {
  return useMutation({
    mutationFn: ({ groupId, cycleId, params = {} }) =>
      downloadCyclePaymentHistory(groupId, cycleId, params),
  })
}

export const useWaiveContribution = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: waiveContribution,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          'cycle-contributions',
          variables.groupId,
          variables.cycleId,
        ],
      })
    },
  })
}
