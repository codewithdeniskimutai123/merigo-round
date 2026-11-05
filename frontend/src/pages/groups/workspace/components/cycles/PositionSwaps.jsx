
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import Card from '../../../../../components/Card.jsx'
import Button from '../../../../../components/Button.jsx'

import {
  useRequestCycleSwap,
  useAcceptCycleSwap,
  useRejectCycleSwap,
} from '../../../../../hooks/useCycles.js'

function getMemberName(member) {
  const fullName = [
    member?.first_name,
    member?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || member?.username || 'Group member'
}

function getSwapMemberName(member) {
  if (!member) return 'Unknown member'

  return getMemberName(member)
}

function getStatusLabel(status) {
  const labels = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    EXPIRED: 'Expired',
  }

  return labels[status] || status || 'Unknown'
}

function getStatusStyles(status) {
  const styles = {
    PENDING:
      'border-amber-500/30 text-amber-700 dark:text-amber-300',
    ACCEPTED:
      'border-green-500/30 text-green-700 dark:text-green-300',
    REJECTED:
      'border-red-500/30 text-red-700 dark:text-red-300',
    EXPIRED:
      'border-border text-text-muted',
  }

  return styles[status] || styles.EXPIRED
}

export default function PositionSwaps({
  groupId,
  cycleId,
  swaps = [],
  orderData,
  isLoading,
  isAdmin,
  isDraft,
  onRefresh,
}) {
  const [targetMembershipId, setTargetMembershipId] = useState('')
  const [activeSwapAction, setActiveSwapAction] = useState(null)
  const [currentTime, setCurrentTime] = useState(() => Date.now())

  const requestSwapMutation = useRequestCycleSwap(groupId, cycleId)
  const acceptSwapMutation = useAcceptCycleSwap(groupId, cycleId)
  const rejectSwapMutation = useRejectCycleSwap(groupId, cycleId)

  // Keep the deadline check current while the page remains open.
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const members = Array.isArray(orderData?.members)
    ? orderData.members
    : []

  const orderStatus = orderData?.order_status
  const myMembershipId = orderData?.my_draw_status?.membership_id

  // Read the deadline from the order details API response.
  const swapDeadline = orderData?.swap_deadline ?? null

  const parsedSwapDeadline = swapDeadline
    ? new Date(swapDeadline).getTime()
    : null

  const hasValidSwapDeadline =
    parsedSwapDeadline !== null &&
    Number.isFinite(parsedSwapDeadline)

  const swapDeadlinePassed =
    hasValidSwapDeadline &&
    currentTime >= parsedSwapDeadline

  // Exclude the logged-in member from possible swap targets.
  const availableMembers = members.filter(
    (member) =>
      String(member.membership_id) !== String(myMembershipId),
  )

  const canShowRequestForm =
    isDraft &&
    orderStatus === 'OPEN' &&
    availableMembers.length > 0

  const canRequestSwap =
    canShowRequestForm &&
    hasValidSwapDeadline &&
    !swapDeadlinePassed

  // Requests sent by the logged-in member.
  const outgoingRequests = swaps.filter(
    (swap) =>
      String(swap.requester?.membership_id) === String(myMembershipId),
  )

  // Pending requests received by the logged-in member.
  const incomingRequests = swaps.filter(
    (swap) =>
      swap.status === 'PENDING' &&
      String(swap.target?.membership_id) === String(myMembershipId) &&
      String(swap.requester?.membership_id) !== String(myMembershipId),
  )

  function handleRequestSwap(event) {
    event.preventDefault()

    if (!hasValidSwapDeadline) {
      toast.error('The swap deadline is unavailable. Please refresh the page.')
      return
    }

    if (Date.now() >= parsedSwapDeadline) {
      setCurrentTime(Date.now())
      toast.error('The swap deadline has passed.')
      return
    }

    if (!targetMembershipId) {
      toast.error('Please select a member to swap positions with.')
      return
    }

    requestSwapMutation.mutate(Number(targetMembershipId), {
      onSuccess: () => {
        setTargetMembershipId('')
        onRefresh?.()
      },
    })
  }

  function handleAccept(swapId) {
    setActiveSwapAction({
      id: swapId,
      action: 'accept',
    })

    acceptSwapMutation.mutate(swapId, {
      onSuccess: () => {
        onRefresh?.()
      },
      onSettled: () => {
        setActiveSwapAction(null)
      },
    })
  }

  function handleReject(swapId) {
    setActiveSwapAction({
      id: swapId,
      action: 'reject',
    })

    rejectSwapMutation.mutate(swapId, {
      onSuccess: () => {
        onRefresh?.()
      },
      onSettled: () => {
        setActiveSwapAction(null)
      },
    })
  }

  function renderSwapRequest(
    swap,
    showActions = false,
    isIncoming = false,
  ) {
    const requester = swap.requester
    const target = swap.target

    const isProcessing = activeSwapAction?.id === swap.id

    return (
      <article
        key={swap.id}
        className="group rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand-600/40 hover:shadow-md sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isIncoming ? (
              <>
                <p className="text-sm font-semibold leading-6 text-text">
                  {getSwapMemberName(requester)} requested to swap
                  positions with you.
                </p>

                <p className="mt-2 text-sm leading-6 text-text-muted">
                  They are requesting to exchange their payout position
                  with yours.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold leading-6 text-text">
                  You requested to swap positions with{' '}
                  {getSwapMemberName(target)}.
                </p>

                <p className="mt-2 text-sm leading-6 text-text-muted">
                  {swap.status === 'PENDING'
                    ? `Waiting for ${getSwapMemberName(target)} to respond.`
                    : swap.status === 'ACCEPTED'
                      ? `${getSwapMemberName(target)} accepted your request.`
                      : swap.status === 'REJECTED'
                        ? `${getSwapMemberName(target)} rejected your request.`
                        : 'Position exchange request details.'}
                </p>
              </>
            )}
          </div>

          <span
            className={`shrink-0 rounded-full border bg-surface-secondary px-3 py-1.5 text-xs font-semibold ${getStatusStyles(swap.status)}`}
          >
            {getStatusLabel(swap.status)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3">
          <p className="text-xs text-text-muted">
            Requested:{' '}
            {swap.requested_at
              ? new Date(swap.requested_at).toLocaleString()
              : 'Not available'}
          </p>

          {swap.responded_at && (
            <p className="text-xs text-text-muted">
              Responded:{' '}
              {new Date(swap.responded_at).toLocaleString()}
            </p>
          )}
        </div>

        {showActions && (
          <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="danger"
              disabled={
                acceptSwapMutation.isPending ||
                rejectSwapMutation.isPending
              }
              onClick={() => handleReject(swap.id)}
            >
              {isProcessing && activeSwapAction.action === 'reject'
                ? 'Rejecting...'
                : 'Reject request'}
            </Button>

            <Button
              type="button"
              variant="primary"
              disabled={
                acceptSwapMutation.isPending ||
                rejectSwapMutation.isPending
              }
              onClick={() => handleAccept(swap.id)}
            >
              {isProcessing && activeSwapAction.action === 'accept'
                ? 'Accepting...'
                : 'Accept request'}
            </Button>
          </div>
        )}
      </article>
    )
  }

  return (
    <Card
      title="Position swaps"
      description="Members can request to exchange their payout positions before the order is finalized."
    >
      <div className="space-y-7">

        {/* Request a swap */}
        {canShowRequestForm && (
          <form
            onSubmit={handleRequestSwap}
            className="rounded-xl border border-border bg-surface-secondary/50 p-4 transition-colors duration-200 sm:p-5"
          >
            <div className="mb-5">
              <h3 className="font-semibold text-text">
                Request a position swap
              </h3>

              <p className="mt-1 text-sm leading-6 text-text-muted">
                Choose a group member whose payout position you would
                like to exchange with yours.
              </p>
            </div>

            <div>
              <label
                htmlFor="swap-target"
                className="mb-2 block text-sm font-medium text-text"
              >
                Select a member
              </label>

              <select
                id="swap-target"
                value={targetMembershipId}
                onChange={(event) =>
                  setTargetMembershipId(event.target.value)
                }
                disabled={
                  !canRequestSwap ||
                  requestSwapMutation.isPending
                }
                className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition-all duration-200 hover:border-brand-600/50 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select a member</option>

                {availableMembers.map((member) => (
                  <option
                    key={member.membership_id}
                    value={member.membership_id}
                  >
                    {getMemberName(member)} — Position {member.position}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex flex-col items-end gap-3">
              <Button
                type="submit"
                variant="primary"
                disabled={
                  !canRequestSwap ||
                  !targetMembershipId ||
                  requestSwapMutation.isPending
                }
              >
                {requestSwapMutation.isPending
                  ? 'Sending request...'
                  : 'Request position swap'}
              </Button>
            </div>

            {!hasValidSwapDeadline && (
              <div
                role="status"
                className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4"
              >
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  Swap deadline unavailable
                </p>

                <p className="mt-1 text-sm leading-6 text-text-muted">
                  The swap deadline could not be loaded. Refresh the page
                  before submitting a request.
                </p>
              </div>
            )}

            {swapDeadlinePassed && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4"
              >
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Swap deadline reached
                </p>

                <p className="mt-1 text-sm leading-6 text-red-600 dark:text-red-400">
                  The deadline for submitting position-swap requests
                  has passed. You can no longer submit a swap request
                  for this cycle.
                </p>
              </div>
            )}
          </form>
        )}

        {!canShowRequestForm && (
          <div className="rounded-xl border border-border bg-surface-secondary/50 p-4">
            <p className="text-sm leading-6 text-text-muted">
              {orderStatus === 'PENDING'
                ? 'Position swaps will become available after the draw is completed and the order opens.'
                : orderStatus === 'LOCKED'
                  ? 'The payout order has been finalized. Position swaps are no longer available.'
                  : 'Position swaps are currently unavailable.'}
            </p>
          </div>
        )}

        {/* Incoming requests */}
        <section className="border-t border-border pt-6">
          <div className="mb-4">
            <h3 className="font-semibold text-text">
              Incoming swap requests
            </h3>

            <p className="mt-1 text-sm leading-6 text-text-muted">
              Requests from members asking to exchange positions with you.
            </p>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-text-muted">
              Loading incoming requests...
            </p>
          ) : incomingRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-secondary/30 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-text">
                No incoming requests
              </p>

              <p className="mt-1 text-sm text-text-muted">
                You do not have any pending position swap requests.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((swap) =>
                renderSwapRequest(swap, !isAdmin, true)
              )}
            </div>
          )}
        </section>

        {/* Outgoing requests */}
        <section className="border-t border-border pt-6">
          <div className="mb-4">
            <h3 className="font-semibold text-text">
              My sent requests
            </h3>

            <p className="mt-1 text-sm leading-6 text-text-muted">
              Follow the status of position swaps you have requested.
            </p>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-text-muted">
              Loading your requests...
            </p>
          ) : outgoingRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-secondary/30 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-text">
                No sent requests
              </p>

              <p className="mt-1 text-sm text-text-muted">
                You have not sent any position swap requests.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {outgoingRequests.map((swap) =>
                renderSwapRequest(swap)
              )}
            </div>
          )}
        </section>

        {/* Admin monitoring */}
        {isAdmin && (
          <p className="border-t border-border pt-5 text-xs leading-6 text-text-muted">
            Swap requests are handled by the requesting and target members.
            The administrator can monitor their status before finalizing
            the payout order.
          </p>
        )}
      </div>
    </Card>
  )
}
