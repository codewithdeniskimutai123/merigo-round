
import { useState } from 'react'
import Card from '../../../../../components/Card.jsx'
import Button from '../../../../../components/Button.jsx'
import {
  useGroupCycles,
  useCyclePayouts,
  useCycleRounds,
  useCreateCyclePayout,
  useInitiateCyclePayout,
  useReconcileCyclePayout,
} from '../../../../../hooks/useCycles.js'
import { formatAmount } from '../../utils/groupWorkspaceUtils.js'

function getItems(data, key) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.[key])) return data[key]
  return []
}

function getRecipientName(payout) {
  const recipient = payout?.recipient_details

  if (!recipient) return payout?.recipient_name || 'Unknown recipient'

  return (
    [recipient.first_name, recipient.last_name].filter(Boolean).join(' ') ||
    recipient.username ||
    'Unknown recipient'
  )
}

function getRoundRecipientName(round) {
  const recipient = round?.recipient_details

  if (!recipient) return 'Recipient not available'

  return (
    [recipient.first_name, recipient.last_name].filter(Boolean).join(' ') ||
    recipient.username ||
    'Recipient not available'
  )
}

function getStatusClass(status) {
  switch (status) {
    case 'SUCCESS':
      return 'bg-green-100 text-green-700'
    case 'FAILED':
    case 'CANCELLED':
      return 'bg-red-100 text-red-700'
    case 'PENDING':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-surface-secondary text-text-muted'
  }
}

function PayoutRecord({
  payout,
  canManagePayouts,
  onInitiate,
  onReconcile,
  busy,
}) {
  const status = payout.status

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-text">
            {getRecipientName(payout)}
          </p>

          <p className="mt-1 text-sm text-text-muted">
            Round {payout.round_number ?? '—'} · {payout.phone_number}
          </p>

          <p className="mt-1 text-sm text-text-muted">
            {payout.transaction_reference || 'No transaction reference yet'}
          </p>
        </div>

        <div className="sm:text-right">
          <p className="font-semibold text-text">
            {formatAmount(payout.amount)}
          </p>

          <span
            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(status)}`}
          >
            {status}
          </span>
        </div>
      </div>

      {payout.failure_reason && (
        <p className="mt-3 text-sm text-red-600">
          {payout.failure_reason}
        </p>
      )}

      {canManagePayouts && status === 'PENDING' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => onInitiate(payout.id)}
          >
            Initiate M-Pesa payout
          </Button>

          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => onReconcile(payout.id)}
          >
            Check transaction status
          </Button>
        </div>
      )}
    </div>
  )
}

function CyclePayoutSection({ groupId, cycle, canManagePayouts }) {
  const [phoneNumbers, setPhoneNumbers] = useState({})
  const cycleId = cycle.id

  const {
    data: payoutData,
    isLoading: payoutsLoading,
  } = useCyclePayouts(groupId, cycleId)

  const {
    data: roundsData,
    isLoading: roundsLoading,
  } = useCycleRounds(groupId, cycleId)

  const createPayout = useCreateCyclePayout(groupId, cycleId)
  const initiatePayout = useInitiateCyclePayout(groupId, cycleId)
  const reconcilePayout = useReconcileCyclePayout(groupId, cycleId)

  const payouts = getItems(payoutData, 'payouts')
  const rounds = getItems(roundsData, 'rounds')

  const busy =
    createPayout.isPending ||
    initiatePayout.isPending ||
    reconcilePayout.isPending

  const existingPayoutForRound = (roundId) =>
    payouts.some(
      (payout) =>
        Number(payout.round) === Number(roundId) ||
        Number(payout.round_id) === Number(roundId)
    )

  const handleCreate = async (round) => {
    const phoneNumber = (
      phoneNumbers[round.id] ??
      round.recipient_details?.phone_number ??
      ''
    ).trim()

    if (!phoneNumber) return

    await createPayout.mutateAsync({
      roundId: round.id,
      payoutData: {
        phone_number: phoneNumber,
      },
    })

    setPhoneNumbers((current) => {
      const updated = { ...current }
      delete updated[round.id]
      return updated
    })
  }

  return (
    <Card
      title={cycle.name || `Cycle ${cycle.cycle_number || cycle.id}`}
      description={`Cycle status: ${cycle.status || '—'}`}
    >
      <div className="space-y-5">
        {canManagePayouts && (
          <div>
            <h3 className="mb-3 font-semibold text-text">
              Create payout records
            </h3>

            {roundsLoading ? (
              <p className="text-sm text-text-muted">
                Loading rounds...
              </p>
            ) : rounds.length === 0 ? (
              <p className="text-sm text-text-muted">
                No rounds are available for this cycle.
              </p>
            ) : (
              <div className="space-y-3">
                {rounds.map((round) => {
                  const alreadyCreated = existingPayoutForRound(round.id)

                  const eligible = [
                    'COMPLETED',
                    'READY_FOR_PAYOUT',
                  ].includes(round.status)

                  const profilePhone =
                    round.recipient_details?.phone_number || ''

                  const phoneNumber =
                    phoneNumbers[round.id] ?? profilePhone

                  return (
                    <div
                      key={round.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-text">
                            Round {round.round_number}
                          </p>

                          <p className="text-sm text-text-muted">
                            {getRoundRecipientName(round)}
                          </p>
                        </div>

                        <p className="font-semibold text-text">
                          {formatAmount(round.expected_payout_amount)}
                        </p>
                      </div>

                      {alreadyCreated ? (
                        <p className="mt-3 text-sm text-text-muted">
                          A payout record already exists for this round.
                        </p>
                      ) : eligible ? (
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(event) =>
                              setPhoneNumbers((current) => ({
                                ...current,
                                [round.id]: event.target.value,
                              }))
                            }
                            placeholder="Recipient M-Pesa number"
                            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
                          />

                          <Button
                            variant="primary"
                            disabled={busy || !phoneNumber.trim()}
                            onClick={() => handleCreate(round)}
                          >
                            Create payout
                          </Button>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-text-muted">
                          A payout can be created when this round is ready.
                        </p>
                      )}

                      {eligible && !alreadyCreated && !profilePhone && (
                        <p className="mt-2 text-xs text-text-muted">
                          This member has no phone number in their profile.
                          Enter their M-Pesa number above.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <h3 className="mb-3 font-semibold text-text">
            Payout records
          </h3>

          {payoutsLoading ? (
            <p className="text-sm text-text-muted">
              Loading payouts...
            </p>
          ) : payouts.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface-secondary p-4 text-sm text-text-muted">
              No payout records have been created for this cycle yet.
            </p>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <PayoutRecord
                  key={payout.id}
                  payout={payout}
                  canManagePayouts={canManagePayouts}
                  busy={busy}
                  onInitiate={(id) => initiatePayout.mutate(id)}
                  onReconcile={(id) => reconcilePayout.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function GroupPayouts({ groupId, canManagePayouts }) {
  const {
    data: cyclesData,
    isLoading,
    isError,
  } = useGroupCycles(groupId)

  const cycles = getItems(cyclesData, 'cycles')

  if (isLoading) {
    return (
      <Card title="Payout schedule">
        <p className="text-sm text-text-muted">
          Loading cycles...
        </p>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card title="Payout schedule">
        <p className="text-sm text-red-600">
          Unable to load cycles and payout records. Please try again.
        </p>
      </Card>
    )
  }

  if (cycles.length === 0) {
    return (
      <Card title="Payout schedule">
        <p className="text-sm text-text-muted">
          Payout records will appear here after a cycle has been created.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {cycles.map((cycle) => (
        <CyclePayoutSection
          key={cycle.id}
          groupId={groupId}
          cycle={cycle}
          canManagePayouts={canManagePayouts}
        />
      ))}
    </div>
  )
}
