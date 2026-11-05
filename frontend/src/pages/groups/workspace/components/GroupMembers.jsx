import Card from '../../../../components/Card.jsx'
import Button from '../../../../components/Button.jsx'

function GroupMembers({
  isAdmin,
  pendingMembersLoading,
  pendingMembersError,
  pendingMembersErrorDetails,
  pendingMembers,
  pendingMembersFetching,
  refetchPendingMembers,
  approveMemberMutation,
  rejectMemberMutation,
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
  return (
    <div className="space-y-6">
      {isAdmin && (
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
      )}

      <Card
        title="Active group members"
        description="These are the active members currently belonging to this group."
      >
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
        ) : members?.length ? (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text-muted">
                {members.length} active{' '}
                {members.length === 1 ? 'member' : 'members'}
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
              {members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
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