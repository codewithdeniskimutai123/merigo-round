import { useEffect, useState } from 'react'
import {
  formatRole,
  getMemberName,
} from '../utils/groupWorkspaceUtils.js'
import Button from '../../../../components/Button.jsx'

function getProfilePhoto(member) {
  const photo = member.profile_photo || member.user?.profile_photo

  if (!photo || typeof photo !== 'string') return ''

  if (/^https?:\/\//i.test(photo)) {
    return photo
  }

  const apiBase =
    import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

  const backendBase = apiBase.replace(/\/api\/?$/, '')

  try {
    return new URL(photo, `${backendBase}/`).toString()
  } catch {
    return photo
  }
}

function getInitials(name) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'M'
  )
}

function MemberCard({
  member,
  isCurrentUser = false,
  onRequestLeave,
  onCancelLeave,
  requestingLeave = false,
  cancellingLeave = false,
  leaveRejectionReason = '',
  leaveCancellationMessage = '',
}) {
  const isLeaveRequested = member.status === 'LEAVE_REQUESTED'
  const isAdmin = member.role?.toUpperCase() === 'ADMIN'
  const canRequestLeave = isCurrentUser && !isAdmin
  const memberName = getMemberName(member)
  const profilePhoto = getProfilePhoto(member)

  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [profilePhoto])

  const username = member.username || member.user?.username
  const email = member.email || member.user?.email
  const phoneNumber =
    member.phone_number || member.user?.phone_number

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {profilePhoto && !imageFailed ? (
            <img
              src={profilePhoto}
              alt={`${memberName}'s profile`}
              className="h-14 w-14 shrink-0 rounded-full border border-border object-cover"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              aria-label={`${memberName}'s profile placeholder`}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#452044]/10 text-lg font-bold text-[#452044]"
            >
              {getInitials(memberName)}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-text">
                {memberName}
              </h3>

              {isCurrentUser && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  You
                </span>
              )}
            </div>

            {username && (
              <p className="mt-1 text-sm text-text-muted">
                @{username}
              </p>
            )}
          </div>
        </div>

        <span className="rounded-full bg-[#452044]/10 px-3 py-1.5 text-xs font-semibold text-[#452044]">
          {formatRole(member.role)}
        </span>
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {email && (
          <div>
            <p className="text-xs text-text-muted">Email address</p>
            <p className="break-all text-sm font-medium text-text">
              {email}
            </p>
          </div>
        )}

        {phoneNumber && (
          <div>
            <p className="text-xs text-text-muted">Phone number</p>
            <p className="text-sm font-medium text-text">
              {phoneNumber}
            </p>
          </div>
        )}

        {/* Membership status remains visible. */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-text-muted">
            Membership status
          </span>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isLeaveRequested
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {isLeaveRequested ? 'Leave requested' : 'Active'}
          </span>
        </div>

        {/* Display a genuine leave rejection separately. */}
        {isCurrentUser && leaveRejectionReason && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-semibold text-red-800">
              Your leave request was rejected
            </p>
            <p className="mt-1 text-sm text-red-700">
              Reason: {leaveRejectionReason}
            </p>
          </div>
        )}

        {/* Display member cancellation separately from rejection. */}
        {isCurrentUser && leaveCancellationMessage && (
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-medium text-text">
              {leaveCancellationMessage}
            </p>
          </div>
        )}

        {canRequestLeave && isLeaveRequested && (
          <div className="space-y-2 pt-3">
            <p className="text-sm text-amber-700">
              Your request to leave this group is awaiting administrator
              review.
            </p>

            <Button
              variant="secondary"
              block
              onClick={onCancelLeave}
              disabled={cancellingLeave}
            >
              {cancellingLeave
                ? 'Cancelling...'
                : 'Cancel leave request'}
            </Button>
          </div>
        )}

        {canRequestLeave && !isLeaveRequested && onRequestLeave && (
          <div className="pt-3">
            <Button
              variant="secondary"
              block
              onClick={onRequestLeave}
              disabled={requestingLeave}
            >
              {requestingLeave
                ? 'Submitting...'
                : 'Request to leave group'}
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}

export default MemberCard