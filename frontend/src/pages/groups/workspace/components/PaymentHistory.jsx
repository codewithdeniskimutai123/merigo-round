
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  useGroupCycles,
} from '../../../../hooks/useCycles.js'

import {
  useCyclePaymentHistory,
  useDownloadCyclePaymentHistory,
} from '../../../../hooks/useContributions.js'

import {
  formatAmount,
  formatDateTime,
} from '../utils/groupWorkspaceUtils.js'

const PAYMENT_STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'SUCCESS', label: 'Successful' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function getStatusLabel(status) {
  const labels = {
    SUCCESS: 'Successful',
    PENDING: 'Pending',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
  }

  return labels[status] || status || 'Unknown'
}

function getStatusClasses(status) {
  const classes = {
    SUCCESS: 'bg-green-100 text-green-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    FAILED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-700',
  }

  return classes[status] || 'bg-surface-secondary text-text-muted'
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#452044] border-t-transparent" />
      <p className="text-sm text-text-muted">
        Loading payment history...
      </p>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-border bg-surface-secondary px-5 py-10 text-center">
      <p className="font-medium text-text">{message}</p>
      <p className="mt-2 text-sm text-text-muted">
        Payment transactions will appear here when available.
      </p>
    </div>
  )
}

function PaymentRecord({ payment, isAdmin }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text">
            {payment.mpesa_receipt_number || 'No M-Pesa receipt'}
          </p>

          <p className="mt-1 text-sm text-text-muted">
            Round {payment.round_number}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(payment.status)}`}
        >
          {getStatusLabel(payment.status)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {isAdmin && (
          <div>
            <p className="text-text-muted">Member</p>
            <p className="mt-1 font-medium text-text">
              {payment.member_name || payment.username || 'Unknown member'}
            </p>
            {payment.username && (
              <p className="text-xs text-text-muted">
                @{payment.username}
              </p>
            )}
          </div>
        )}

        <div>
          <p className="text-text-muted">Amount</p>
          <p className="mt-1 font-semibold text-text">
            {formatAmount(payment.amount)}
          </p>
        </div>

        <div>
          <p className="text-text-muted">Phone number</p>
          <p className="mt-1 font-medium text-text">
            {payment.phone_number || 'Not available'}
          </p>
        </div>

        <div>
          <p className="text-text-muted">Transaction date</p>
          <p className="mt-1 font-medium text-text">
            {payment.transaction_date
              ? formatDateTime(payment.transaction_date)
              : payment.created_at
                ? formatDateTime(payment.created_at)
                : 'Not available'}
          </p>
        </div>

        <div>
          <p className="text-text-muted">Created</p>
          <p className="mt-1 font-medium text-text">
            {payment.created_at
              ? formatDateTime(payment.created_at)
              : 'Not available'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PaymentHistory({
  groupId,
  isAdmin,
}) {
  const [selectedCycleId, setSelectedCycleId] = useState('')
  const [scope, setScope] = useState(isAdmin ? 'all' : 'mine')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const {
    data: cyclesData,
    isLoading: cyclesLoading,
    isError: cyclesError,
    refetch: refetchCycles,
  } = useGroupCycles(groupId)

  const cycles = useMemo(() => {
    if (Array.isArray(cyclesData)) {
      return cyclesData
    }

    return cyclesData?.cycles || cyclesData?.results || []
  }, [cyclesData])

  useEffect(() => {
    if (!cycles.length) {
      setSelectedCycleId('')
      return
    }

    const selectedCycleExists = cycles.some(
      (cycle) => String(cycle.id) === String(selectedCycleId),
    )

    if (!selectedCycleExists) {
      setSelectedCycleId(String(cycles[0].id))
    }
  }, [cycles, selectedCycleId])

  useEffect(() => {
    if (!isAdmin) {
      setScope('mine')
    }
  }, [isAdmin])

  const params = useMemo(() => ({
    scope: isAdmin ? scope : 'mine',
    status: selectedStatus,
  }), [isAdmin, scope, selectedStatus])

  const {
    data: historyData,
    isLoading: historyLoading,
    isFetching: historyFetching,
    isError: historyError,
    error,
    refetch: refetchHistory,
  } = useCyclePaymentHistory(
    groupId,
    selectedCycleId,
    params,
  )

  const downloadMutation = useDownloadCyclePaymentHistory()

  const payments = historyData?.payments || []
  const totalPayments = historyData?.total_payments ?? payments.length

  async function handleDownload() {
    if (!selectedCycleId || downloadMutation.isPending) return

    try {
      const blob = await downloadMutation.mutateAsync({
        groupId,
        cycleId: selectedCycleId,
        params,
      })

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      const selectedCycle = cycles.find(
        (cycle) => String(cycle.id) === String(selectedCycleId),
      )

      link.href = url
      link.download = `payment_history_cycle_${selectedCycleId}_${params.scope}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(url)

      toast.success('Payment history downloaded successfully.')
    } catch (downloadError) {
      toast.error(
        downloadError.response?.data?.detail ||
          'Unable to download payment history. Please try again.',
      )
    }
  }

  if (cyclesLoading) {
    return <LoadingState />
  }

  if (cyclesError) {
    return (
      <div className="rounded-xl border border-border p-5">
        <p className="font-semibold text-text">
          Unable to load cycles
        </p>
        <p className="mt-2 text-sm text-text-muted">
          We could not retrieve the group's cycles.
        </p>
        <button
          type="button"
          onClick={() => refetchCycles()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text">
          Payment history
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          View M-Pesa transactions, payment references and transaction statuses.
        </p>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              scope === 'all'
                ? 'bg-primary text-white'
                : 'border border-border text-text hover:bg-surface-secondary'
            }`}
          >
            All payments
          </button>

          <button
            type="button"
            onClick={() => setScope('mine')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              scope === 'mine'
                ? 'bg-primary text-white'
                : 'border border-border text-text hover:bg-surface-secondary'
            }`}
          >
            My payments
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="payment-cycle"
            className="mb-2 block text-sm font-medium text-text"
          >
            Select cycle
          </label>

          <select
            id="payment-cycle"
            value={selectedCycleId}
            onChange={(event) => setSelectedCycleId(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm text-text outline-none focus:border-primary"
          >
            {cycles.map((cycle) => (
              <option key={cycle.id} value={String(cycle.id)}>
                {cycle.name || `Cycle ${cycle.id}`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="payment-status"
            className="mb-2 block text-sm font-medium text-text"
          >
            Filter by status
          </label>

          <select
            id="payment-status"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm text-text outline-none focus:border-primary"
          >
            {PAYMENT_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-text">
            {scope === 'mine' ? 'My transactions' : 'All member transactions'}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {totalPayments} transaction{totalPayments === 1 ? '' : 's'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={
            !selectedCycleId ||
            downloadMutation.isPending ||
            historyLoading
          }
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {downloadMutation.isPending
            ? 'Preparing download...'
            : 'Download CSV'}
        </button>
      </div>

      {cycles.length === 0 ? (
        <EmptyState message="No cycles are available for this group." />
      ) : historyLoading ? (
        <LoadingState />
      ) : historyError ? (
        <div className="rounded-xl border border-border p-5">
          <p className="font-semibold text-text">
            Unable to load payment history
          </p>
          <p className="mt-2 text-sm text-text-muted">
            {error.response?.data?.detail ||
              'We could not retrieve these transactions.'}
          </p>
          <button
            type="button"
            onClick={() => refetchHistory()}
            disabled={historyFetching}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {historyFetching ? 'Loading...' : 'Try again'}
          </button>
        </div>
      ) : payments.length === 0 ? (
        <EmptyState message="No payment transactions found for this selection." />
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => (
            <PaymentRecord
              key={payment.id}
              payment={payment}
              isAdmin={isAdmin && scope === 'all'}
            />
          ))}
        </div>
      )}
    </div>
  )
}
