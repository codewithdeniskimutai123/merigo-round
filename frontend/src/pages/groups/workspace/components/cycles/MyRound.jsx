
import Card from '../../../../../components/Card.jsx'

function formatAmount(amount) {
  const value = Number(amount)

  if (!Number.isFinite(value)) return '—'

  return `KSh ${value.toLocaleString('en-KE')}`
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
    month: 'long',
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

export default function MyRound({ myRound, isLoading }) {
  if (isLoading) {
    return (
      <Card title="My payout round">
        <p className="py-5 text-center text-sm text-text-muted">
          Loading your payout information...
        </p>
      </Card>
    )
  }

  // The backend returns the serialized Round directly.
  // It does not wrap the round inside a "round" property.
  const round = myRound

  if (!round || !round.id) {
    return (
      <Card
        title="My payout round"
        description="Your personal payout schedule for this cycle."
      >
        <div className="rounded-lg border border-border bg-surface-secondary p-5">
          <p className="font-medium text-text">
            No payout round assigned
          </p>

          <p className="mt-1 text-sm leading-6 text-text-muted">
            Your payout information will appear here once the cycle
            administrator has created the rounds and assigned the payout order.
          </p>
        </div>
      </Card>
    )
  }

  const status = round.status || 'PENDING'

  return (
    <Card
      title="My payout round"
      description="Your personal payout information for this savings cycle."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-text-muted">
              Your payout position
            </p>

            <p className="mt-1 text-3xl font-bold text-text">
              {round.round_number ?? 'Not assigned'}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyles(status)}`}
          >
            {status}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <p className="text-xs text-text-muted">
              Expected payout
            </p>

            <p className="mt-2 text-xl font-bold text-text">
              {formatAmount(round.expected_payout_amount)}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <p className="text-xs text-text-muted">
              Scheduled payout date
            </p>

            <p className="mt-2 text-lg font-semibold text-text">
              {formatDate(round.start_date || round.due_date)}
            </p>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          {status === 'ACTIVE' && (
            <p className="text-sm leading-6 text-text-muted">
              Your payout round is currently active. Check your group
              payment instructions and ensure your contributions are up to date.
            </p>
          )}

          {status === 'COMPLETED' && (
            <p className="text-sm leading-6 text-text-muted">
              Your payout round has been completed.
            </p>
          )}

          {status === 'PENDING' && (
            <p className="text-sm leading-6 text-text-muted">
              Your payout round is scheduled. You will be able to track
              its progress as the cycle advances.
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
