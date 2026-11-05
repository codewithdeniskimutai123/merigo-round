
import { useState } from 'react'

import Button from '../../../../components/Button.jsx'
import Input from '../../../../components/Input.jsx'

import { getMemberName } from '../utils/groupWorkspaceUtils.js'

export default function PendingMemberCard({
  member,
  onApprove,
  onReject,
  approving,
  rejecting,
}) {
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')

  const isBusy = approving || rejecting

  async function handleReject() {
    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      setReasonError('Please provide a reason for rejecting this request.')
      return
    }

    setReasonError('')

    try {
      await onReject(trimmedReason)
      setReason('')
    } catch {
      // The mutation handles displaying the rejection error.
    }
  }

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-text">
            {getMemberName(member)}
          </h3>

          <p className="mt-1 text-sm text-text-muted">
            @{member.username}
          </p>
        </div>

        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
          Pending
        </span>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {member.email && (
          <div>
            <p className="text-xs text-text-muted">Email address</p>
            <p className="break-all text-sm font-medium text-text">
              {member.email}
            </p>
          </div>
        )}

        {member.phone_number && (
          <div>
            <p className="text-xs text-text-muted">Phone number</p>
            <p className="text-sm font-medium text-text">
              {member.phone_number}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 space-y-4">
        <Button
          type="button"
          onClick={onApprove}
          disabled={isBusy}
          className="w-full"
        >
          {approving ? 'Approving...' : 'Approve member'}
        </Button>

        <div>
          <Input
            id={`rejection-reason-${member.id}`}
            label="Reason for rejection"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              if (reasonError) setReasonError('')
            }}
            placeholder="Explain why this request is being rejected"
            error={reasonError}
            disabled={isBusy}
            required
          />

          <Button
            type="button"
            variant="danger"
            onClick={handleReject}
            disabled={isBusy}
            className="mt-3 w-full"
          >
            {rejecting ? 'Rejecting...' : 'Reject request'}
          </Button>
        </div>
      </div>
    </article>
  )
}
