import { useState } from 'react'

import Card from '../../../../../components/Card.jsx'
import Button from '../../../../../components/Button.jsx'
import {
  useExtendRoundDueDate,
  useRoundDateHistory,
} from '../../../../../hooks/useCycles.js'

function formatAmount(amount) {
  const value = Number(amount)

  if (!Number.isFinite(value)) return '—'

  return `KSh ${value.toLocaleString('en-KE')}`
}

function getMemberName(round) {
  const recipient = round?.recipient_details

  if (!recipient) return 'Group member'

  const fullName = [
    recipient.first_name,
    recipient.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || recipient.username || 'Group member'
}

function formatDate(date) {
  if (!date) return 'Not scheduled'

  const parsedDate = new Date(
    `${String(date).slice(0, 10)}T00:00:00`,
  )

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available'
  }

  return parsedDate.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(date) {
  if (!date) return 'Not available'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available'
  }

  return parsedDate.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getNextDate(date) {
  if (!date) return ''

  const parsedDate = new Date(
    `${String(date).slice(0, 10)}T00:00:00`,
  )

  if (Number.isNaN(parsedDate.getTime())) return ''

  parsedDate.setDate(parsedDate.getDate() + 1)

  const year = parsedDate.getFullYear()
  const month = String(parsedDate.getMonth() + 1).padStart(2, '0')
  const day = String(parsedDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getStatusStyles(status) {
  const styles = {
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-amber-100 text-amber-800',
    WAITING_FOR_PAYMENT: 'bg-amber-100 text-amber-800',
    READY_FOR_PAYOUT: 'bg-purple-100 text-purple-800',
    UPCOMING: 'bg-surface-secondary text-text-muted',
    DRAFT: 'bg-surface-secondary text-text-muted',
    CANCELLED: 'bg-red-100 text-red-800',
  }

  return styles[status] || 'bg-surface-secondary text-text-muted'
}

function RoundDateHistory({
  cycleId,
  round,
  isOpen,
}) {
  const {
    data,
    isLoading,
    isError,
  } = useRoundDateHistory(
    cycleId,
    round.id,
    isOpen,
  )

  const history = Array.isArray(data)
    ? data
    : data?.results || data?.history || []

  if (!isOpen) return null
  

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface-secondary p-4">
      <h4 className="font-semibold text-text">
        Date change history
      </h4>

      {isLoading ? (
        <p className="mt-3 text-sm text-text-muted">
          Loading date history...
        </p>
      ) : isError ? (
        <p className="mt-3 text-sm text-red-600">
          Unable to load the date history. Please try again.
        </p>
      ) : history.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">
          No date extensions have been recorded for this round.
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {history.map((change) => (
            <div
              key={change.id}
              className="border-b border-border pb-4 last:border-0 last:pb-0"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-text-muted">
                    Previous dates
                  </p>

                  <p className="mt-1 text-sm text-text">
                    Start: {formatDate(change.previous_start_date)}
                  </p>

                  <p className="text-sm text-text">
                    Due: {formatDate(change.previous_due_date)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-text-muted">
                    Updated dates
                  </p>

                  <p className="mt-1 text-sm font-medium text-text">
                    Start: {formatDate(change.new_start_date)}
                  </p>

                  <p className="text-sm font-medium text-text">
                    Due: {formatDate(change.new_due_date)}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-xs text-text-muted">
                  Reason
                </p>

                <p className="mt-1 text-sm text-text">
                  {change.reason}
                </p>
              </div>

              <p className="mt-2 text-xs text-text-muted">
                Changed by {change.changed_by_username || 'Administrator'}
                {' · '}
                {formatDateTime(change.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RoundDateExtension({
  cycleId,
  round,
  isAdmin,
  cycleStatus,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [newDueDate, setNewDueDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const {
    mutate: extendDueDate,
    isPending,
  } = useExtendRoundDueDate(cycleId, round.id)

  const canExtend =
    isAdmin &&
    cycleStatus === 'ACTIVE' &&
    ['ACTIVE', 'WAITING_FOR_PAYMENT'].includes(round.status)

  console.log('Round extension eligibility:', {
  cycleId,
  roundId: round.id,
  isAdmin,
  cycleStatus,
  roundStatus: round.status,
  canExtend,
})
  function handleCancel() {
    if (isPending) return

    setIsEditing(false)
    setNewDueDate('')
    setReason('')
    setError('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (isPending) return

    if (!newDueDate) {
      setError('Please select a new due date.')
      return
    }

    if (newDueDate <= String(round.due_date).slice(0, 10)) {
      setError(
        'The new due date must be later than the current due date.',
      )
      return
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the extension.')
      return
    }

    setError('')

    extendDueDate(
      {
        new_due_date: newDueDate,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setIsEditing(false)
          setNewDueDate('')
          setReason('')
        },
      },
    )
  }

  if (!canExtend) return null

  return (
    <div className="mt-4 border-t border-border pt-4">
      {!isEditing ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setIsEditing(true)}
        >
          Extend round due date
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-border bg-surface-secondary p-4"
        >
          <div>
            <h4 className="font-semibold text-text">
              Extend Round {round.round_number}
            </h4>

            <p className="mt-1 text-sm text-text-muted">
              Current due date: {formatDate(round.due_date)}
            </p>
          </div>

          <div>
            <label
              htmlFor={`new-due-date-${round.id}`}
              className="mb-1 block text-sm font-medium text-text"
            >
              New due date
            </label>

            <input
              id={`new-due-date-${round.id}`}
              type="date"
              min={getNextDate(round.due_date)}
              value={newDueDate}
              onChange={(event) => {
                setNewDueDate(event.target.value)
                setError('')
              }}
              disabled={isPending}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label
              htmlFor={`extension-reason-${round.id}`}
              className="mb-1 block text-sm font-medium text-text"
            >
              Reason for extension
            </label>

            <textarea
              id={`extension-reason-${round.id}`}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                setError('')
              }}
              disabled={isPending}
              required
              rows={3}
              placeholder="Explain why this round needs more time..."
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isPending}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending ? 'Extending dates...' : 'Confirm extension'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function RoundItem({
  round,
  cycleId,
  isAdmin,
  cycleStatus,
}) {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text">
            Round {round.round_number}
          </p>

          <p className="mt-1 text-sm text-text-muted">
            Recipient: {getMemberName(round)}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyles(round.status)}`}
        >
          {round.status.replaceAll('_', ' ')}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-text-muted">
            Scheduled start date
          </p>

          <p className="mt-1 text-sm font-medium text-text">
            {formatDate(round.start_date)}
          </p>
        </div>

        <div>
          <p className="text-xs text-text-muted">
            Contribution due date
          </p>

          <p className="mt-1 text-sm font-medium text-text">
            {formatDate(round.due_date)}
          </p>
        </div>

        <div>
          <p className="text-xs text-text-muted">
            Expected payout
          </p>

          <p className="mt-1 text-sm font-medium text-text">
            {formatAmount(round.expected_payout_amount)}
          </p>
        </div>
      </div>

      <RoundDateExtension
        cycleId={cycleId}
        round={round}
        isAdmin={isAdmin}
        cycleStatus={cycleStatus}
      />

      <div className="mt-4 border-t border-border pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowHistory((previous) => !previous)}
        >
          {showHistory ? 'Hide date history' : 'View date history'}
        </Button>

        <RoundDateHistory
          cycleId={cycleId}
          round={round}
          isOpen={showHistory}
        />
      </div>
    </article>
  )
}

export default function CycleRounds({
  rounds = [],
  cycleId,
  isLoading,
  isAdmin,
  cycleStatus,
  onActivateNextRound,
  canActivateNextRound,
  isActivatingNextRound,
}) {
  const sortedRounds = Array.isArray(rounds)
    ? [...rounds].sort(
        (a, b) =>
          Number(a.round_number || 0) -
          Number(b.round_number || 0),
      )
    : []

  const activeRound = sortedRounds.find(
    (round) => round.status === 'ACTIVE',
  )

  const completedRounds = sortedRounds.filter(
    (round) => round.status === 'COMPLETED',
  ).length

  const remainingRounds = sortedRounds.filter(
    (round) => !['COMPLETED', 'CANCELLED'].includes(round.status),
  ).length

  if (isLoading) {
    return (
      <Card title="Payout rounds">
        <p className="py-5 text-center text-sm text-text-muted">
          Loading payout rounds...
        </p>
      </Card>
    )
  }

  return (
    <Card
      title="Payout rounds"
      description="View the scheduled payout order and progress of every round in this cycle."
    >
      <div className="space-y-5">
        {sortedRounds.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface-secondary p-5 text-center">
            <p className="font-medium text-text">
              No payout rounds created
            </p>

            <p className="mt-1 text-sm text-text-muted">
              The administrator must finalize the payout order and create
              rounds before payouts can begin.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-surface-secondary p-4">
                <p className="text-xs text-text-muted">
                  Total rounds
                </p>

                <p className="mt-1 text-2xl font-bold text-text">
                  {sortedRounds.length}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface-secondary p-4">
                <p className="text-xs text-text-muted">
                  Completed rounds
                </p>

                <p className="mt-1 text-2xl font-bold text-text">
                  {completedRounds}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface-secondary p-4">
                <p className="text-xs text-text-muted">
                  Remaining rounds
                </p>

                <p className="mt-1 text-2xl font-bold text-text">
                  {remainingRounds}
                </p>
              </div>
            </div>

            {activeRound && (
              <div className="rounded-lg border border-border bg-surface-secondary p-4">
                <p className="text-xs font-medium text-text-muted">
                  Currently active round
                </p>

                <p className="mt-1 text-lg font-bold text-text">
                  Round {activeRound.round_number}
                </p>

                <p className="mt-1 text-sm text-text-muted">
                  Recipient: {getMemberName(activeRound)}
                </p>
              </div>
            )}

            <div className="space-y-3">
              {sortedRounds.map((round) => (
                <RoundItem
                  key={round.id}
                  round={round}
                  cycleId={cycleId}
                  isAdmin={isAdmin}
                  cycleStatus={cycleStatus}
                />
              ))}
            </div>

            {isAdmin && cycleStatus === 'ACTIVE' && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
                <div>
                  <p className="font-semibold text-text">
                    Activate next round
                  </p>

                  <p className="mt-1 text-sm text-text-muted">
                    The next round can only be activated after the current
                    round is completed and its scheduled date has arrived.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={onActivateNextRound}
                  disabled={
                    !canActivateNextRound ||
                    isActivatingNextRound
                  }
                >
                  {isActivatingNextRound
                    ? 'Activating...'
                    : 'Activate next round'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  )
}