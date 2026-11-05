
import Card from '../../../../../components/Card.jsx'
import Button from '../../../../../components/Button.jsx'

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

function getStatusStyles(status) {
  const styles = {
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-amber-100 text-amber-800',
    DRAFT: 'bg-surface-secondary text-text-muted',
    CANCELLED: 'bg-red-100 text-red-800',
  }

  return styles[status] || 'bg-surface-secondary text-text-muted'
}

export default function CycleRounds({
  rounds = [],
  isLoading,
  isAdmin,
  cycleStatus,
  onActivateNextRound,
  canActivateNextRound,
  isActivatingNextRound,
}) {
  // The backend already returns rounds ordered by round_number.
  // Sorting here also protects the display if the order changes.
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
                  {sortedRounds.length - completedRounds}
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
                <article
                  key={round.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
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
                      {round.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-text-muted">
                        Scheduled date
                      </p>

                      <p className="mt-1 text-sm font-medium text-text">
                        {formatDate(round.start_date || round.due_date)}
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
                </article>
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
