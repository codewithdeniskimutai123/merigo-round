
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import Button from '../../../../../components/Button.jsx'

import {
  useInitiateContributionPayment,
  useContributionPaymentStatus,
} from '../../../../../hooks/usePayments.js'

import {
  formatAmount,
  formatDateTime,
} from '../../utils/groupWorkspaceUtils.js'

export default function ContributionPayment({
  contribution,
  currentUser,
  isAdmin,
}) {
  const queryClient = useQueryClient()

  const [phoneNumber, setPhoneNumber] = useState(
    currentUser?.phone_number || '',
  )

  const [amount, setAmount] = useState('')

  const [transactionId, setTransactionId] = useState(null)

  const successHandled = useRef(false)

  const initiatePaymentMutation = useInitiateContributionPayment()

  const {
    data: transaction,
    isError: statusError,
    isFetching: statusFetching,
    refetch: refetchStatus,
  } = useContributionPaymentStatus(
    transactionId,
    Boolean(transactionId),
  )

  const paymentStatus = transaction?.status

  const balance = Math.max(
    Number(
      contribution.balance ?? (
        Number(contribution.amount_due || 0) -
        Number(contribution.amount_paid || 0)
      ),
    ),
    0,
  )

  const isPaid =
    contribution.status === 'PAID' ||
    paymentStatus === 'SUCCESS'

  const isWaived = contribution.status === 'WAIVED'

  const isFailed = ['FAILED', 'CANCELLED'].includes(paymentStatus)

  const contributionMemberId =
    contribution?.member ?? contribution?.member_details?.id

  const isOwnContribution = !isAdmin
    ? true
    : (
        (
          currentUser?.id &&
          contributionMemberId &&
          String(currentUser.id) === String(contributionMemberId)
        ) ||
        (
          currentUser?.username &&
          contribution?.member_details?.username &&
          currentUser.username === contribution.member_details.username
        )
      )

  const paymentAmount = Number(amount)

  const isValidAmount =
    amount.trim() !== '' &&
    Number.isInteger(paymentAmount) &&
    paymentAmount > 0 &&
    paymentAmount <= balance

  useEffect(() => {
    if (paymentStatus === 'SUCCESS' && !successHandled.current) {
      successHandled.current = true

      queryClient.invalidateQueries({
        queryKey: ['cycle-contributions'],
      })

      toast.success('Your M-Pesa payment was successful.')
    }
  }, [paymentStatus, queryClient])

  async function handleInitiatePayment(event) {
    event.preventDefault()

    if (
      !phoneNumber.trim() ||
      !isValidAmount ||
      initiatePaymentMutation.isPending
    ) {
      return
    }

    setTransactionId(null)
    successHandled.current = false

    try {
      const response = await initiatePaymentMutation.mutateAsync({
        contribution_id: contribution.id,
        amount: paymentAmount,
        phone_number: phoneNumber.trim(),
      })

      const newTransactionId = response?.transaction?.id

      if (!newTransactionId) {
        toast.error('The payment request did not return a transaction ID.')
        return
      }

      setTransactionId(newTransactionId)

      toast.success(
        response.message ||
          'M-Pesa payment request sent. Check your phone.',
      )
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          'Unable to initiate your M-Pesa payment.',
      )
    }
  }

  function handleRetryPayment() {
    setTransactionId(null)
    setAmount('')
    successHandled.current = false
  }

  if (isWaived) {
    return (
      <div className="rounded-xl border border-border bg-surface-secondary p-5">
        <p className="font-semibold text-text">
          This contribution has been waived.
        </p>

        <p className="mt-2 text-sm text-text-muted">
          No payment is required for this contribution.
        </p>
      </div>
    )
  }

  if (isPaid || balance <= 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-secondary p-5">
        <p className="font-semibold text-text">
          This contribution is fully paid.
        </p>

        <p className="mt-2 text-sm text-text-muted">
          There is no outstanding balance to pay.
        </p>

        {transaction?.mpesa_receipt_number && (
          <div className="mt-4">
            <p className="text-sm text-text-muted">
              M-Pesa receipt number
            </p>

            <p className="mt-1 font-semibold text-text">
              {transaction.mpesa_receipt_number}
            </p>
          </div>
        )}

        {transaction?.transaction_date && (
          <div className="mt-3">
            <p className="text-sm text-text-muted">
              Transaction date
            </p>

            <p className="mt-1 font-semibold text-text">
              {formatDateTime(transaction.transaction_date)}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (!isOwnContribution) {
    return (
      <div className="rounded-xl border border-border bg-surface-secondary p-5">
        <p className="font-semibold text-text">
          Payment belongs to another member.
        </p>

        <p className="mt-2 text-sm text-text-muted">
          Only the member assigned to this contribution can initiate its payment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-surface-secondary p-5">
        <p className="text-sm text-text-muted">
          Outstanding balance
        </p>

        <p className="mt-1 text-2xl font-bold text-text">
          KSh {formatAmount(balance)}
        </p>

        <p className="mt-2 text-sm text-text-muted">
          You can pay the full balance or make a smaller partial payment.
        </p>
      </div>

      {transactionId && paymentStatus === 'PENDING' && (
        <div className="rounded-xl border border-border bg-surface-secondary p-5">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#452044] border-t-transparent" />

            <p className="font-semibold text-text">
              Waiting for M-Pesa confirmation
            </p>
          </div>

          <p className="mt-3 text-sm leading-6 text-text-muted">
            Check your phone and enter your M-Pesa PIN to complete
            the payment. This page will automatically check the
            transaction status.
          </p>

          <p className="mt-3 text-xs text-text-muted">
            Transaction ID: {transactionId}
          </p>
        </div>
      )}

      {transactionId && isFailed && (
        <div className="rounded-xl border border-border bg-surface-secondary p-5">
          <p className="font-semibold text-text">
            Payment was not completed.
          </p>

          <p className="mt-2 text-sm text-text-muted">
            The transaction was {paymentStatus.toLowerCase()}.
            You can try initiating the payment again.
          </p>

          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={handleRetryPayment}
            >
              Try payment again
            </Button>
          </div>
        </div>
      )}

      {transactionId && statusError && (
        <div className="rounded-xl border border-border bg-surface-secondary p-5">
          <p className="font-semibold text-text">
            Unable to check payment status.
          </p>

          <p className="mt-2 text-sm text-text-muted">
            Your payment request was submitted, but we could not
            retrieve its latest status.
          </p>

          <div className="mt-4">
            <Button
              variant="secondary"
              onClick={() => refetchStatus()}
              disabled={statusFetching}
            >
              {statusFetching ? 'Checking...' : 'Check payment status'}
            </Button>
          </div>
        </div>
      )}

      {!transactionId && (
        <form onSubmit={handleInitiatePayment} className="space-y-4">
          <div>
            <label
              htmlFor="payment-amount"
              className="mb-2 block text-sm font-medium text-text"
            >
              Amount to pay (KSh)
            </label>

            <input
              id="payment-amount"
              type="number"
              min="1"
              max={balance}
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter payment amount"
              required
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-text outline-none transition placeholder:text-text-muted focus:border-[#452044] focus:ring-2 focus:ring-[#452044]/10"
            />

            <p className="mt-2 text-xs text-text-muted">
              Maximum payment: KSh {formatAmount(balance)}.
              You can pay in smaller amounts.
            </p>

            {amount !== '' && !isValidAmount && (
              <p className="mt-2 text-sm text-red-600">
                Enter a whole amount greater than zero and not exceeding your outstanding balance.
              </p>
            )}

            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              className="mt-2 text-sm font-medium text-text underline underline-offset-4"
            >
              Pay full outstanding balance
            </button>
          </div>

          <div>
            <label
              htmlFor="payment-phone-number"
              className="mb-2 block text-sm font-medium text-text"
            >
              M-Pesa phone number
            </label>

            <input
              id="payment-phone-number"
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="e.g. 0712345678"
              required
              maxLength={20}
              className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-text outline-none transition placeholder:text-text-muted focus:border-[#452044] focus:ring-2 focus:ring-[#452044]/10"
            />

            <p className="mt-2 text-xs text-text-muted">
              Enter the phone number registered with M-Pesa.
            </p>
          </div>

          <Button
            type="submit"
            disabled={
              !phoneNumber.trim() ||
              !isValidAmount ||
              initiatePaymentMutation.isPending
            }
          >
            {initiatePaymentMutation.isPending
              ? 'Sending payment request...'
              : `Pay KSh ${formatAmount(paymentAmount || 0)}`}
          </Button>
        </form>
      )}
    </div>
  )
}
