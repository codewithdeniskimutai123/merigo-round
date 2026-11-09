
import { useState } from 'react'

import Card from '../../../../components/Card.jsx'
import Button from '../../../../components/Button.jsx'

import { useWaiveContribution } from '../../../../hooks/useContributions.js'

import {
  formatAmount,
  formatDate,
  formatDateTime,
} from '../utils/groupWorkspaceUtils.js'

import ContributionPayment from './payments/ContributionPayment.jsx'

function getContributionBalance(contribution) {
  if (
    contribution.balance !== undefined &&
    contribution.balance !== null
  ) {
    return Math.max(Number(contribution.balance), 0)
  }

  return Math.max(
    Number(contribution.amount_due || 0) -
      Number(contribution.amount_paid || 0) -
      Number(contribution.amount_waived || 0),
    0,
  )
}

function getContributionMemberName(contribution) {
  const member = contribution?.member_details

  if (!member) return 'Unknown member'

  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()

  return fullName || member.username || 'Unknown member'
}

function getContributionStatusLabel(status) {
  return String(status || 'PENDING').replaceAll('_', ' ')
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.amount?.[0] ||
    error?.response?.data?.reason?.[0] ||
    error?.message ||
    'Unable to apply the waiver. Please try again.'
  )
}

export default function ContributionDetail({
  contribution,
  group,
  isAdmin,
  currentUser,
  onBack,
}) {
  const [waiverAmount, setWaiverAmount] = useState('')
  const [waiverReason, setWaiverReason] = useState('')

  const waiveMutation = useWaiveContribution()

  const currentContribution =
    waiveMutation.data?.contribution || contribution

  const balance = getContributionBalance(currentContribution)
  const memberName = getContributionMemberName(currentContribution)
  const amountWaived = Number(currentContribution.amount_waived || 0)

  const amountValue = Number(waiverAmount)

  const waiverAmountError =
    waiverAmount.trim() === ''
      ? 'Please enter a waiver amount.'
      : !Number.isFinite(amountValue) || amountValue <= 0
        ? 'Waiver amount must be greater than zero.'
        : amountValue > balance
          ? `Waiver amount cannot exceed the outstanding balance of KSh ${formatAmount(balance)}.`
          : ''

  const waiverReasonError = !waiverReason.trim()
    ? 'Please provide a reason for the waiver.'
    : ''

  const canWaive =
    isAdmin &&
    balance > 0 &&
    !['PAID', 'WAIVED'].includes(currentContribution.status)

  const isWaiverFormValid =
    !waiverAmountError && !waiverReasonError

  function handleApplyWaiver() {
    if (!isWaiverFormValid || waiveMutation.isPending) {
      return
    }

    if (!currentContribution.cycleId) {
      return
    }

    waiveMutation.mutate(
      {
        groupId: group.id,
        cycleId: currentContribution.cycleId,
        contributionId: currentContribution.id,
        amount: waiverAmount,
        reason: waiverReason.trim(),
      },
      {
        onSuccess: () => {
          setWaiverAmount('')
          setWaiverReason('')
        },
      },
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-muted">
            {group?.name}
          </p>

          <h2 className="mt-1 text-xl font-bold text-text">
            Contribution details
          </h2>

          <p className="mt-1 text-sm text-text-muted">
            Review this contribution and its outstanding balance.
          </p>
        </div>

        <Button onClick={onBack}>
          Back to contributions
        </Button>
      </div>

      <Card
        title={`Round ${currentContribution.round_number}`}
        description="Individual contribution record"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {isAdmin && (
            <div>
              <p className="text-sm text-text-muted">Member</p>

              <p className="mt-1 font-semibold text-text">
                {memberName}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm text-text-muted">
              Contribution status
            </p>

            <p className="mt-1 font-semibold text-text">
              {getContributionStatusLabel(currentContribution.status)}
            </p>
          </div>

          <div>
            <p className="text-sm text-text-muted">Amount due</p>

            <p className="mt-1 font-semibold text-text">
              KSh {formatAmount(currentContribution.amount_due)}
            </p>
          </div>

          <div>
            <p className="text-sm text-text-muted">Amount paid</p>

            <p className="mt-1 font-semibold text-text">
              KSh {formatAmount(currentContribution.amount_paid)}
            </p>
          </div>

          <div>
            <p className="text-sm text-text-muted">Amount waived</p>

            <p className="mt-1 font-semibold text-text">
              KSh {formatAmount(amountWaived)}
            </p>
          </div>

          <div>
            <p className="text-sm text-text-muted">
              Outstanding balance
            </p>

            <p className="mt-1 text-lg font-bold text-text">
              KSh {formatAmount(balance)}
            </p>
          </div>

          <div>
            <p className="text-sm text-text-muted">Due date</p>

            <p className="mt-1 font-semibold text-text">
              {formatDate(currentContribution.due_date)}
            </p>
          </div>

          {currentContribution.paid_at && (
            <div>
              <p className="text-sm text-text-muted">Paid at</p>

              <p className="mt-1 font-semibold text-text">
                {formatDateTime(currentContribution.paid_at)}
              </p>
            </div>
          )}
        </div>

        {amountWaived > 0 && (
          <div className="mt-5 border-t border-border pt-5">
            <h3 className="font-semibold text-text">
              Waiver information
            </h3>

            <div className="mt-3 space-y-3">
              {currentContribution.waiver_reason && (
                <div>
                  <p className="text-sm text-text-muted">
                    Reason
                  </p>

                  <p className="mt-1 text-sm text-text">
                    {currentContribution.waiver_reason}
                  </p>
                </div>
              )}

              {currentContribution.waived_by_username && (
                <div>
                  <p className="text-sm text-text-muted">
                    Authorized by
                  </p>

                  <p className="mt-1 text-sm font-medium text-text">
                    {currentContribution.waived_by_username}
                  </p>
                </div>
              )}

              {currentContribution.waived_at && (
                <div>
                  <p className="text-sm text-text-muted">
                    Waiver date
                  </p>

                  <p className="mt-1 text-sm text-text">
                    {formatDateTime(currentContribution.waived_at)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {canWaive && (
        <Card
          title="Waive contribution"
          description="As an administrator, you can waive part or all of this member's outstanding balance."
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-muted">
                Maximum amount you can waive
              </p>

              <p className="mt-1 text-lg font-bold text-text">
                KSh {formatAmount(balance)}
              </p>
            </div>

            <div>
              <label
                htmlFor="waiver-amount"
                className="mb-1.5 block text-sm font-medium text-text"
              >
                Waiver amount (KSh)
              </label>

              <input
                id="waiver-amount"
                type="number"
                min="0.01"
                max={balance}
                step="0.01"
                value={waiverAmount}
                onChange={(event) => setWaiverAmount(event.target.value)}
                placeholder="Enter amount to waive"
                disabled={waiveMutation.isPending}
                aria-invalid={Boolean(waiverAmountError)}
                aria-describedby="waiver-amount-error"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
              />

              {waiverAmountError && (
                <p
                  id="waiver-amount-error"
                  className="mt-2 text-sm text-red-600"
                  role="alert"
                >
                  {waiverAmountError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="waiver-reason"
                className="mb-1.5 block text-sm font-medium text-text"
              >
                Reason for waiver
              </label>

              <textarea
                id="waiver-reason"
                rows={3}
                value={waiverReason}
                onChange={(event) => setWaiverReason(event.target.value)}
                placeholder="Explain why this amount is being waived..."
                disabled={waiveMutation.isPending}
                aria-invalid={Boolean(waiverReasonError)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
              />

              {waiverReasonError && (
                <p className="mt-2 text-sm text-red-600" role="alert">
                  {waiverReasonError}
                </p>
              )}
            </div>

            {waiveMutation.isError && (
              <p className="text-sm text-red-600" role="alert">
                {getErrorMessage(waiveMutation.error)}
              </p>
            )}

            <Button
              onClick={handleApplyWaiver}
              disabled={!isWaiverFormValid || waiveMutation.isPending}
            >
              {waiveMutation.isPending ? 'Applying waiver...' : 'Apply waiver'}
            </Button>
          </div>
        </Card>
      )}

      <Card
        title="Payment"
        description="Pay your outstanding contribution using M-Pesa."
      >
        <ContributionPayment
          contribution={currentContribution}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />
      </Card>
    </div>
  )
}
