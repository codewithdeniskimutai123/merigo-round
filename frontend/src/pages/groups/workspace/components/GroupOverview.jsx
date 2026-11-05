import Card from '../../../../components/Card.jsx'
import Button from '../../../../components/Button.jsx'
import GroupForm from '../../../../components/GroupForm.jsx'

import { formatAmount, formatDate, formatHistoryDate } from '../utils/groupWorkspaceUtils.js'

function GroupOverview({
  group,
  membershipStatus,
  membershipRole,
  isMember,
  isPending,
  isRejected,
  membershipHistoryLoading,
  latestRejection,
  cancelJoinMutation,
  checkingProfile,
  requestJoinMutation,
  isActiveGroup,
  handleRequestToJoin,
  canRequestMembership,
  isAdmin,
  setActiveSection,
  canManageDraftGroup,
  showEditForm,
  setShowEditForm,
  confirmDelete,
  setConfirmDelete,
  handleUpdateGroup,
  updateGroupMutation,
  handleDeleteGroup,
  deleteGroupMutation,
}) {
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Contribution amount">
          <p className="text-2xl font-bold text-text">
            KSh {formatAmount(group.contribution_amount)}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {group.frequency}
          </p>
        </Card>

        <Card title="Maximum members">
          <p className="text-2xl font-bold text-text">
            {group.max_members}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Group capacity
          </p>
        </Card>

        <Card title="Group status">
          <p className="text-2xl font-bold text-text">
            {group.status}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Current group status
          </p>
        </Card>

        <Card title="Start date">
          <p className="text-lg font-bold text-text">
            {formatDate(group.start_date)}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Planned group start
          </p>
        </Card>
      </section>

      <Card title="Group information">
        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-muted">
              Group name
            </dt>
            <dd className="mt-1 font-semibold text-text">
              {group.name}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-text-muted">
              Contribution frequency
            </dt>
            <dd className="mt-1 font-semibold text-text">
              {group.frequency}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-text-muted">
              Contribution amount
            </dt>
            <dd className="mt-1 font-semibold text-text">
              KSh {formatAmount(group.contribution_amount)}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-text-muted">
              Group start date
            </dt>
            <dd className="mt-1 font-semibold text-text">
              {formatDate(group.start_date)}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-text-muted">
              Your membership
            </dt>
            <dd className="mt-1 font-semibold text-text">
              {membershipStatus || 'Not a member'}
            </dd>
          </div>

          <div>
            <dt className="text-sm text-text-muted">
              Your group role
            </dt>
            <dd className="mt-1 font-semibold text-text">
              {membershipRole || 'None'}
            </dd>
          </div>
        </dl>
      </Card>

      {!isMember && (
        <Card
          title="Membership"
          description="Membership is required to participate in this group's activities."
        >
          {isPending ? (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                Your request is awaiting administrator approval.
                You will gain access to the member workspace once
                your membership is activated.
              </p>

              <Button
                variant="danger"
                onClick={() => cancelJoinMutation.mutate()}
                disabled={cancelJoinMutation.isPending}
              >
                {cancelJoinMutation.isPending
                  ? 'Cancelling request...'
                  : 'Cancel membership request'}
              </Button>
            </div>
          ) : isRejected ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                <p className="font-semibold text-red-800 dark:text-red-300">
                  Your membership request was rejected.
                </p>

                {membershipHistoryLoading ? (
                  <p className="mt-2 text-sm text-red-700 dark:text-red-200">
                    Loading the administrator's feedback...
                  </p>
                ) : latestRejection ? (
                  <>
                    <p className="mt-3 text-sm font-semibold text-red-800 dark:text-red-300">
                      Reason provided by the administrator
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-red-700 dark:text-red-200">
                      {latestRejection.reason ||
                        'No rejection reason was provided.'}
                    </p>

                    <p className="mt-3 text-xs text-red-700/80 dark:text-red-300/80">
                      Rejected on:{' '}
                      {formatHistoryDate(latestRejection.created_at)}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-red-700 dark:text-red-200">
                    The rejection details are currently unavailable.
                  </p>
                )}
              </div>

              <p className="text-sm text-text-muted">
                You may submit another membership request if this group
                is still active and accepting new members.
              </p>

              <Button
                onClick={handleRequestToJoin}
                disabled={
                  !isActiveGroup ||
                  checkingProfile ||
                  requestJoinMutation.isPending
                }
              >
                {checkingProfile
                  ? 'Checking profile...'
                  : requestJoinMutation.isPending
                    ? 'Submitting request...'
                    : isActiveGroup
                      ? 'Request to join again'
                      : 'Group not accepting members'}
              </Button>
            </div>
          ) : canRequestMembership ? (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                You can request membership if this group is accepting
                new members.
              </p>

              <Button
                onClick={handleRequestToJoin}
                disabled={
                  !isActiveGroup ||
                  checkingProfile ||
                  requestJoinMutation.isPending
                }
              >
                {checkingProfile
                  ? 'Checking profile...'
                  : requestJoinMutation.isPending
                    ? 'Submitting request...'
                    : isActiveGroup
                      ? 'Request to join'
                      : 'Group not accepting members'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-red-600">
              Your membership is currently {membershipStatus?.toLowerCase()}.
              Please contact the group administrator if you need assistance.
            </p>
          )}
        </Card>
      )}

      {isMember && (
        <Card
          title="Your membership"
          description="Your access and responsibilities are determined by your group role."
        >
          <div className="space-y-3">
            <p className="text-sm text-text">
              Membership status: <strong>{membershipStatus}</strong>
            </p>

            <p className="text-sm text-text">
              Assigned role: <strong>{membershipRole}</strong>
            </p>

            {isAdmin ? (
              <p className="text-sm text-text-muted">
                As the group administrator, you have administrative
                responsibilities in addition to member access.
              </p>
            ) : (
              <p className="text-sm text-text-muted">
                You can access your group's member information,
                contributions, payment history, payout schedule and cycles.
              </p>
            )}
          </div>
        </Card>
      )}

      {isAdmin && (
        <Card
          title="Group administration"
          description="Administrative actions available to the group administrator."
        >
          <p className="text-sm leading-6 text-text-muted">
            You can review pending membership requests in the Members
            section and manage savings cycles in the Cycles and rounds
            section.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => setActiveSection('members')}
            >
              Review membership requests
            </Button>

            <Button
              variant="secondary"
              onClick={() => setActiveSection('cycles')}
            >
              Manage cycles
            </Button>
          </div>
        </Card>
      )}

      {/* Draft group management is available only to its active admin. */}
      {canManageDraftGroup && (
        <Card
          title="Manage draft group"
          description="You can edit the group details or delete this draft group."
        >
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowEditForm((current) => !current)
                setConfirmDelete(false)
              }}
            >
              {showEditForm ? 'Close editor' : 'Edit group'}
            </Button>

            <Button
              variant="danger"
              onClick={() => {
                setConfirmDelete((current) => !current)
                setShowEditForm(false)
              }}
            >
              {confirmDelete ? 'Cancel deletion' : 'Delete group'}
            </Button>
          </div>

          {showEditForm && (
            <div className="mt-5 border-t border-border pt-5">
              <h3 className="mb-4 font-semibold text-text">
                Edit group information
              </h3>

              <GroupForm
                key={group.id}
                initialValues={{
                  name: group.name || '',
                  description: group.description || '',
                  contribution_amount: group.contribution_amount ?? '',
                  frequency: group.frequency || 'MONTHLY',
                  start_date: group.start_date || '',
                  max_members: group.max_members ?? '',
                }}
                onSubmit={handleUpdateGroup}
                onCancel={() => setShowEditForm(false)}
                isPending={updateGroupMutation.isPending}
                submitLabel="Save changes"
                pendingLabel="Saving changes..."
                cancelLabel="Cancel editing"
              />
            </div>
          )}

          {confirmDelete && (
            <div className="mt-5 space-y-4 rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">
                  Confirm group deletion
                </h3>

                <p className="mt-2 text-sm leading-6 text-red-700 dark:text-red-200">
                  Are you sure you want to permanently delete{' '}
                  <strong>{group.name}</strong>? This action cannot be
                  undone. Deletion will only succeed if the group has no
                  cycles and no other membership records.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="danger"
                  onClick={handleDeleteGroup}
                  disabled={deleteGroupMutation.isPending}
                >
                  {deleteGroupMutation.isPending
                    ? 'Deleting group...'
                    : 'Yes, delete group'}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteGroupMutation.isPending}
                >
                  Keep group
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default GroupOverview
