import { useState } from 'react'
import Card from '../../../../components/Card.jsx'
import Button from '../../../../components/Button.jsx'

function PendingLeaveRequestCard({
  membership,
  onApprove,
  onReject,
  approving,
  rejecting,
}) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const memberName =
    membership.user?.username ||
    membership.username ||
    membership.user?.email ||
    'Group member'

  async function handleReject() {
    const trimmedReason = reason.trim()

    if (!trimmedReason) {
      setError('A reason is required when rejecting a leave request.')
      return
    }

    setError('')

    try {
      await onReject(trimmedReason)
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
          'Unable to reject this leave request. Please try again.',
      )
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div>
        <p className="font-semibold text-text-primary">{memberName}</p>

        {membership.user?.email && (
          <p className="text-sm text-text-muted">
            {membership.user.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">
          Rejection reason
        </label>

        <textarea
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            if (error) setError('')
          }}
          rows={3}
          placeholder="Enter a reason if you reject this request."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary"
          disabled={approving || rejecting}
        />

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onApprove}
          disabled={approving || rejecting}
        >
          {approving ? 'Approving...' : 'Approve leave'}
        </Button>

        <Button
          variant="secondary"
          onClick={handleReject}
          disabled={approving || rejecting}
        >
          {rejecting ? 'Rejecting...' : 'Reject leave'}
        </Button>
      </div>
    </div>
  )
}

function getMemberUserId(member) {
  return (
    member.user?.id ??
    member.user_id ??
    member.userId ??
    member.user?.user_id ??
    null
  )
}

function isCurrentUserMember(member, currentUser) {
  if (!currentUser) return false

  const memberUserId = getMemberUserId(member)

  if (
    memberUserId != null &&
    currentUser.id != null
  ) {
    return String(memberUserId) === String(currentUser.id)
  }

  const memberUsername =
    member.username || member.user?.username

  if (
    memberUsername &&
    currentUser.username &&
    memberUsername.toLowerCase() === currentUser.username.toLowerCase()
  ) {
    return true
  }

  const memberEmail = member.email || member.user?.email

  return Boolean(
    memberEmail &&
      currentUser.email &&
      memberEmail.toLowerCase() === currentUser.email.toLowerCase(),
  )
}

function sortMembers(members, currentUser) {
  return [...members].sort((first, second) => {
    const firstIsCurrentUser = isCurrentUserMember(first, currentUser)
    const secondIsCurrentUser = isCurrentUserMember(second, currentUser)

    if (firstIsCurrentUser) return -1
    if (secondIsCurrentUser) return 1

    const firstIsAdmin =
      String(first.role || '').toUpperCase() === 'ADMIN'

    const secondIsAdmin =
      String(second.role || '').toUpperCase() === 'ADMIN'

    if (firstIsAdmin) return -1
    if (secondIsAdmin) return 1

    return 0
  })
}

function GroupMembers({
  isAdmin,

  // Logged-in user.
  currentUser,

  // Pending group membership requests.
  pendingMembersLoading,
  pendingMembersError,
  pendingMembersErrorDetails,
  pendingMembers,
  pendingMembersFetching,
  refetchPendingMembers,
  approveMemberMutation,
  rejectMemberMutation,

  // Pending group leave requests.
  pendingLeaveRequests = [],
  pendingLeaveRequestsLoading = false,
  pendingLeaveRequestsError = false,
  pendingLeaveRequestsErrorDetails,
  pendingLeaveRequestsFetching = false,
  refetchPendingLeaveRequests,
  approveLeaveMutation,
  rejectLeaveMutation,

  // Current user's membership and leave actions.
  membershipStatus,
  onRequestLeave,
  onCancelLeave,
  requestingLeave = false,
  cancellingLeave = false,
  leaveRejectionReason = '',
  leaveCancellationMessage = '',

  // Active member directory.
  canViewMemberDirectory,
  membersLoading,
  membersError,
  membersErrorDetails,
  membersFetching,
  members,
  refetchMembers,
  MembersLoadingState,
  PendingMemberCard,
  MemberCard,
}) {
  const leaveRequests = Array.isArray(pendingLeaveRequests)
    ? pendingLeaveRequests
    : pendingLeaveRequests?.results ||
      pendingLeaveRequests?.requests ||
      []

  const memberList = Array.isArray(members) ? members : []

  const sortedMembers = sortMembers(memberList, currentUser)

  return (
    <div className="space-y-6">
      {isAdmin && (
        <>
          <Card
            title="Pending membership requests"
            description="Review people who have requested to join this group."
          >
            {pendingMembersLoading ? (
              <MembersLoadingState />
            ) : pendingMembersError ? (
              <div className="space-y-3 py-4">
                <p className="text-sm text-red-600">
                  {pendingMembersErrorDetails?.response?.data?.detail ||
                    'Unable to load pending membership requests.'}
                </p>

                <Button
                  variant="secondary"
                  onClick={() => refetchPendingMembers()}
                  disabled={pendingMembersFetching}
                >
                  {pendingMembersFetching ? 'Trying again...' : 'Try again'}
                </Button>
              </div>
            ) : pendingMembers?.length ? (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-text-muted">
                    {pendingMembers.length} pending{' '}
                    {pendingMembers.length === 1 ? 'request' : 'requests'}
                  </p>

                  <Button
                    variant="secondary"
                    onClick={() => refetchPendingMembers()}
                    disabled={pendingMembersFetching}
                  >
                    {pendingMembersFetching
                      ? 'Refreshing...'
                      : 'Refresh requests'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {pendingMembers.map((member) => (
                    <PendingMemberCard
                      key={member.id}
                      member={member}
                      onApprove={() =>
                        approveMemberMutation.mutate(member.id)
                      }
                      onReject={(reason) =>
                        rejectMemberMutation.mutateAsync({
                          membershipId: member.id,
                          reason,
                        })
                      }
                      approving={approveMemberMutation.isPending}
                      rejecting={rejectMemberMutation.isPending}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-text-muted">
                There are currently no pending membership requests.
              </p>
            )}
          </Card>

          <Card
            title="Pending leave requests"
            description="Review active group members who have requested to leave this group."
          >
            {pendingLeaveRequestsLoading ? (
              <MembersLoadingState />
            ) : pendingLeaveRequestsError ? (
              <div className="space-y-3 py-4">
                <p className="text-sm text-red-600">
                  {pendingLeaveRequestsErrorDetails?.response?.data?.detail ||
                    'Unable to load pending leave requests.'}
                </p>

                <Button
                  variant="secondary"
                  onClick={() => refetchPendingLeaveRequests?.()}
                  disabled={pendingLeaveRequestsFetching}
                >
                  {pendingLeaveRequestsFetching
                    ? 'Trying again...'
                    : 'Try again'}
                </Button>
              </div>
            ) : leaveRequests.length > 0 ? (
              <>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-text-muted">
                    {leaveRequests.length} pending{' '}
                    {leaveRequests.length === 1 ? 'request' : 'requests'}
                  </p>

                  <Button
                    variant="secondary"
                    onClick={() => refetchPendingLeaveRequests?.()}
                    disabled={pendingLeaveRequestsFetching}
                  >
                    {pendingLeaveRequestsFetching
                      ? 'Refreshing...'
                      : 'Refresh requests'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {leaveRequests.map((membership) => (
                    <PendingLeaveRequestCard
                      key={membership.id}
                      membership={membership}
                      onApprove={() =>
                        approveLeaveMutation.mutate(membership.id)
                      }
                      onReject={(reason) =>
                        rejectLeaveMutation.mutateAsync({
                          membershipId: membership.id,
                          reason,
                        })
                      }
                      approving={approveLeaveMutation.isPending}
                      rejecting={rejectLeaveMutation.isPending}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-text-muted">
                There are currently no pending leave requests.
              </p>
            )}
          </Card>
        </>
      )}

      <Card
        title="Active group members"
        description="You appear first, followed by the group administrator and other members."
      >
        {!isAdmin && membershipStatus === 'ACTIVE' && (
          <div className="mb-6 rounded-xl border border-border p-4">
            <p className="mb-3 text-sm text-text-muted">
              You are currently an active member of this group. You can
              request to leave the group below.
            </p>

            <Button
              variant="secondary"
              onClick={onRequestLeave}
              disabled={requestingLeave || cancellingLeave}
            >
              {requestingLeave
                ? 'Submitting request...'
                : 'Request to Leave Group'}
            </Button>
          </div>
        )}

        {!isAdmin && membershipStatus === 'LEAVE_REQUESTED' && (
          <div className="mb-6 rounded-xl border border-border p-4">
            <p className="mb-3 text-sm text-text-muted">
              Your request to leave this group is awaiting admin review.
            </p>

            <Button
              variant="secondary"
              onClick={onCancelLeave}
              disabled={cancellingLeave || requestingLeave}
            >
              {cancellingLeave
                ? 'Cancelling request...'
                : 'Cancel Leave Request'}
            </Button>
          </div>
        )}

        {!canViewMemberDirectory ? (
          <p className="py-6 text-sm text-text-muted">
            The member directory is available to active group members.
            Your current membership status does not permit access to it.
          </p>
        ) : membersLoading ? (
          <MembersLoadingState />
        ) : membersError ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-red-600">
              {membersErrorDetails?.response?.data?.detail ||
                'Unable to load group members. Please try again.'}
            </p>

            <Button
              onClick={() => refetchMembers()}
              disabled={membersFetching}
            >
              {membersFetching ? 'Trying again...' : 'Try again'}
            </Button>
          </div>
        ) : sortedMembers.length > 0 ? (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                {sortedMembers.length} active{' '}
                {sortedMembers.length === 1 ? 'member' : 'members'}
              </p>

              <Button
                variant="secondary"
                onClick={() => refetchMembers()}
                disabled={membersFetching}
              >
                {membersFetching ? 'Refreshing...' : 'Refresh members'}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {sortedMembers.map((member) => {
                const isCurrentUser = isCurrentUserMember(
                  member,
                  currentUser,
                )

                return (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isCurrentUser={isCurrentUser}
                    leaveRejectionReason={
                      isCurrentUser ? leaveRejectionReason : ''
                    }
                    leaveCancellationMessage={
                      isCurrentUser ? leaveCancellationMessage : ''
                    }
                  />
                )
              })}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-sm text-text-muted">
            There are currently no active members to display.
          </p>
        )}
      </Card>
    </div>
  )
}

export default GroupMembers