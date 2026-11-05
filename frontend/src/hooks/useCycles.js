import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getGroupCycles,
  createCycle,
  getCycleDrawOptions,
  selectCycleDrawOption,
  getCycleOrderDetails,
  finalizeCycleOrder,
  getCycleSwapRequests,
  requestCycleSwap,
  acceptCycleSwap,
  rejectCycleSwap,
  createCycleRounds,
  getCycleRounds,
  getMyCycleRound,
  activateCycle,
  activateNextRound,
} from '../api/cycleApi'

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

function invalidateCycleQueries(queryClient, groupId, cycleId) {
    
  queryClient.invalidateQueries({
    queryKey: ['group', groupId, 'cycles'],
  })

  queryClient.invalidateQueries({
    queryKey: ['cycle', groupId, cycleId],
  })

  queryClient.invalidateQueries({
    queryKey: ['cycle', groupId, cycleId, 'draw-options'],
  })

  queryClient.invalidateQueries({
    queryKey: ['cycle', groupId, cycleId, 'order'],
  })

  queryClient.invalidateQueries({
    queryKey: ['cycle', groupId, cycleId, 'swaps'],
  })

  queryClient.invalidateQueries({
    queryKey: ['cycle', groupId, cycleId, 'rounds'],
  })

  queryClient.invalidateQueries({
    queryKey: ['cycle', groupId, cycleId, 'my-round'],
  })
}

// Cycle queries

export function useGroupCycles(groupId, enabled = true) {
  return useQuery({
    queryKey: ['group', groupId, 'cycles'],
    queryFn: () => getGroupCycles(groupId),
    enabled: Boolean(groupId) && enabled,
  })
}

export function useCycleDrawOptions(groupId, cycleId, enabled = true) {
  return useQuery({
    queryKey: ['cycle', groupId, cycleId, 'draw-options'],
    queryFn: () => getCycleDrawOptions(groupId, cycleId),
    enabled: Boolean(groupId) && Boolean(cycleId) && enabled,
  })
}

export function useCycleOrderDetails(groupId, cycleId, enabled = true) {
  return useQuery({
    queryKey: ['cycle', groupId, cycleId, 'order'],
    queryFn: () => getCycleOrderDetails(groupId, cycleId),
    enabled: Boolean(groupId) && Boolean(cycleId) && enabled,
  })
}

export function useCycleSwapRequests(groupId, cycleId, enabled = true) {
  return useQuery({
    queryKey: ['cycle', groupId, cycleId, 'swaps'],
    queryFn: () => getCycleSwapRequests(groupId, cycleId),
    enabled: Boolean(groupId) && Boolean(cycleId) && enabled,
  })
}

export function useCycleRounds(groupId, cycleId, enabled = true) {
  return useQuery({
    queryKey: ['cycle', groupId, cycleId, 'rounds'],
    queryFn: () => getCycleRounds(groupId, cycleId),
    enabled: Boolean(groupId) && Boolean(cycleId) && enabled,
  })
}

export function useMyCycleRound(groupId, cycleId, enabled = true) {
  return useQuery({
    queryKey: ['cycle', groupId, cycleId, 'my-round'],
    queryFn: () => getMyCycleRound(groupId, cycleId),
    enabled: Boolean(groupId) && Boolean(cycleId) && enabled,
  })
}

// Cycle mutations

export function useCreateCycle(groupId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (cycleData) => createCycle(groupId, cycleData),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['group', groupId, 'cycles'],
      })

      toast.success('Cycle created successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to create cycle. Please try again.'),
      )
    },
  })
}

// Draw mutations

export function useSelectCycleDrawOption(groupId, cycleId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (token) =>
      selectCycleDrawOption(groupId, cycleId, token),

    onSuccess: () => {
      invalidateCycleQueries(queryClient, groupId, cycleId)

      toast.success('Your draw selection has been submitted.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to submit your draw selection.'),
      )
    },
  })
}

// Swap mutations

export function useRequestCycleSwap(groupId, cycleId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (targetMembershipId) =>
      requestCycleSwap(groupId, cycleId, targetMembershipId),

    onSuccess: () => {
      invalidateCycleQueries(queryClient, groupId, cycleId)

      toast.success('Swap request submitted successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to submit swap request.'),
      )
    },
  })
}

export function useAcceptCycleSwap(groupId, cycleId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (swapId) =>
      acceptCycleSwap(groupId, cycleId, swapId),

    onSuccess: () => {
      invalidateCycleQueries(queryClient, groupId, cycleId)

      toast.success('Swap request accepted successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to accept swap request.'),
      )
    },
  })
}

export function useRejectCycleSwap(groupId, cycleId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (swapId) =>
      rejectCycleSwap(groupId, cycleId, swapId),

    onSuccess: () => {
      invalidateCycleQueries(queryClient, groupId, cycleId)

      toast.success('Swap request rejected successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to reject swap request.'),
      )
    },
  })
}

// Order mutation

export function useFinalizeCycleOrder(groupId, cycleId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => finalizeCycleOrder(groupId, cycleId),

    onSuccess: () => {
      invalidateCycleQueries(queryClient, groupId, cycleId)

      toast.success('Cycle payout order finalized successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to finalize cycle order.'),
      )
    },
  })
}

// Round mutations

export function useCreateCycleRounds(groupId, cycleId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => createCycleRounds(groupId, cycleId),

    onSuccess: () => {
      invalidateCycleQueries(queryClient, groupId, cycleId)

      toast.success('Cycle rounds created successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to create cycle rounds.'),
      )
    },
  })
}

// Activation mutations

export function useActivateCycle(groupId, cycleId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => activateCycle(groupId, cycleId),

    onSuccess: () => {
      invalidateCycleQueries(queryClient, groupId, cycleId)

      toast.success('Cycle activated successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to activate cycle.'),
      )
    },
  })
}

export function useActivateNextRound(groupId, cycleId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => activateNextRound(groupId, cycleId),

    onSuccess: () => {
      invalidateCycleQueries(queryClient, groupId, cycleId)

      toast.success('Next round activated successfully.')
    },

    onError: (error) => {
      toast.error(
        getErrorMessage(error, 'Unable to activate the next round.'),
      )
    },
  })
}