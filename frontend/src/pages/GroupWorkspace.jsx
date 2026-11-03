import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { getCurrentUser } from '../api/authApi.js'
import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import Input from '../components/Input.jsx'
import GroupForm from '../components/GroupForm.jsx'

import {
  useGroup,
  useGroupMembers,
  usePendingGroupMembers,
  useRequestToJoinGroup,
  useCancelGroupJoinRequest,
  useApproveGroupMember,
  useRejectGroupMember,
  useMyGroupMembershipHistory,
  useUpdateGroup,
  useDeleteGroup,
} from '../hooks/useGroups.js'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'contributions', label: 'Contributions' },
  { id: 'payments', label: 'Payments' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'cycles', label: 'Cycles and rounds' },
  { id: 'activity', label: 'Activity' },
]

const sectionDescriptions = {
  members: {
    title: 'Group members',
    description:
      'View active member profiles and their assigned group roles.',
  },
  contributions: {
    title: 'Contributions',
    description:
      'View contribution records, amounts due, payments made and outstanding balances.',
  },
  payments: {
    title: 'Payment history',
    description:
      'View your M-Pesa payment records, transaction references and payment statuses.',
  },
  payouts: {
    title: 'Payout schedule',
    description:
      'View payout recipients, expected amounts and payout transaction statuses.',
  },
  cycles: {
    title: 'Cycles and rounds',
    description:
      'View savings cycles, round schedules, payout order and cycle progress.',
  },
  activity: {
    title: 'Group activity',
    description:
      'View important membership, contribution, cycle and payout activities.',
  },
}

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(date) {
  if (!date) return 'Not specified'

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatHistoryDate(date) {
  if (!date) return 'Date unavailable'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return parsedDate.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getStatusStyles(status) {
  const styles = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    DRAFT: 'bg-slate-100 text-slate-700',
    PAUSED: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }

  return styles[status] || 'bg-surface-secondary text-text'
}

function LoadingState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#452044] border-t-transparent" />
      <p className="text-sm text-text-muted">
        Loading group information...
      </p>
    </div>
  )
}

function MembersLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#452044] border-t-transparent" />
      <p className="text-sm text-text-muted">
        Loading group members...
      </p>
    </div>
  )
}

function formatRole(role) {
  if (!role) return 'Member'

  return role.charAt(0) + role.slice(1).toLowerCase()
}

function getMemberName(member) {
  return (
    [member.first_name, member.last_name]
      .filter(Boolean)
      .join(' ') || member.username
  )
}

function MemberCard({ member }) {
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

        <span className="rounded-full bg-[#452044]/10 px-3 py-1.5 text-xs font-semibold text-[#452044]">
          {formatRole(member.role)}
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

        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-text-muted">
            Membership status
          </span>

          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            Active
          </span>
        </div>
      </div>
    </article>
  )
}

function PendingMemberCard({
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
      // The mutation hook displays the API error notification.
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

        <div className="space-y-3 pt-3">
          <Button onClick={onApprove} disabled={isBusy}>
            {approving ? 'Approving...' : 'Approve member'}
          </Button>

          <div className="border-t border-border pt-3">
            <Input
              label="Reason for rejection"
              id={`rejection-reason-${member.id}`}
              placeholder="Explain why this request is being rejected"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)

                if (reasonError) {
                  setReasonError('')
                }
              }}
              error={reasonError}
              required
              disabled={isBusy}
            />

            <div className="mt-3">
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={isBusy}
              >
                {rejecting ? 'Rejecting...' : 'Reject request'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export default function GroupWorkspace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeSection, setActiveSection] = useState('overview')
  const [checkingProfile, setCheckingProfile] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {
    data: group,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGroup(id)

  const membershipStatus = group?.user_membership_status
  const membershipRole = group?.user_membership_role

  const isMember = ['ACTIVE', 'LEAVE_REQUESTED'].includes(
    membershipStatus,
  )

  const isAdmin =
    membershipStatus === 'ACTIVE' && membershipRole === 'ADMIN'

  const canManageDraftGroup = isAdmin && group?.status === 'DRAFT'

  const canViewMemberDirectory = membershipStatus === 'ACTIVE'

  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
    error: membersErrorDetails,
    refetch: refetchMembers,
    isFetching: membersFetching,
  } = useGroupMembers(id, canViewMemberDirectory)

  const {
    data: pendingMembers,
    isLoading: pendingMembersLoading,
    isError: pendingMembersError,
    error: pendingMembersErrorDetails,
    refetch: refetchPendingMembers,
    isFetching: pendingMembersFetching,
  } = usePendingGroupMembers(id, isAdmin)

  const {
    data: membershipHistory,
    isLoading: membershipHistoryLoading,
  } = useMyGroupMembershipHistory(id)

  const requestJoinMutation = useRequestToJoinGroup(id)
  const cancelJoinMutation = useCancelGroupJoinRequest(id)
  const approveMemberMutation = useApproveGroupMember(id)
  const rejectMemberMutation = useRejectGroupMember(id)

  const updateGroupMutation = useUpdateGroup(id)
  const deleteGroupMutation = useDeleteGroup(id)

  const history = membershipHistory?.history || []

  const latestRejection = history.find(
    (item) => item.new_status === 'REJECTED',
  )

  async function handleRequestToJoin() {
    if (checkingProfile || requestJoinMutation.isPending) return

    setCheckingProfile(true)

    try {
      const currentUser = await getCurrentUser()

      if (currentUser.is_profile_complete !== true) {
        navigate('/complete-profile', {
          state: {
            from: {
              pathname: location.pathname,
              search: location.search,
              hash: location.hash,
            },
            action: {
              type: 'JOIN_GROUP',
              groupId: Number(id),
            },
          },
        })

        return
      }

      requestJoinMutation.mutate()
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          'Unable to verify your profile. Please try again.',
      )
    } finally {
      setCheckingProfile(false)
    }
  }

  function handleUpdateGroup(groupData) {
    if (!canManageDraftGroup) return

    updateGroupMutation.mutate(groupData, {
      onSuccess: () => {
        setShowEditForm(false)
      },
    })
  }

  function handleDeleteGroup() {
    if (!canManageDraftGroup || deleteGroupMutation.isPending) return

    deleteGroupMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/dashboard')
      },
    })
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (isError) {
    const isNotFound = error.response?.status === 404

    return (
      <Card
        title={isNotFound ? 'Group not found' : 'Unable to load group'}
        description={
          isNotFound
            ? 'This group does not exist or is no longer available.'
            : 'We could not retrieve this group. Please try again.'
        }
      >
        <div className="flex flex-wrap gap-3">
          {!isNotFound && (
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Trying again...' : 'Try again'}
            </Button>
          )}

          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-lg border border-border px-4 py-2 font-medium text-text transition hover:bg-surface-secondary"
          >
            Back to dashboard
          </Link>
        </div>
      </Card>
    )
  }

  if (!group) return null

  const isPending = membershipStatus === 'PENDING'
  const isRejected = membershipStatus === 'REJECTED'
  const isActiveGroup = group.status === 'ACTIVE'

  const canRequestMembership =
    !membershipStatus ||
    ['LEFT', 'REMOVED', 'CANCELLED', 'REJECTED'].includes(
      membershipStatus,
    )

  const visibleSections = isMember
    ? sections
    : sections.filter((section) => section.id === 'overview')

  const currentSection = sections.find(
    (section) => section.id === activeSection,
  )

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex text-sm font-semibold text-text-muted underline-offset-4 transition hover:text-text hover:underline"
      >
        Back to member dashboard
      </Link>

      {/* Group header */}
      <section className="rounded-2xl bg-[#452044] p-6 text-white shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-sm text-white/75">
              Group workspace
            </p>

            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
              {group.name}
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/80">
              {group.description || 'No group description has been provided.'}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusStyles(group.status)}`}
          >
            {group.status}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {isAdmin && (
            <span className="rounded-lg border border-white/30 px-4 py-3 text-sm font-semibold">
              Group administrator
            </span>
          )}

          {isMember && !isAdmin && (
            <span className="rounded-lg border border-white/30 px-4 py-3 text-sm font-semibold">
              {membershipRole || 'Member'}
            </span>
          )}

          {isPending && (
            <span className="rounded-lg border border-white/30 px-4 py-3 text-sm font-semibold">
              Membership request pending
            </span>
          )}

          {isRejected && (
            <span className="rounded-lg border border-white/30 px-4 py-3 text-sm font-semibold">
              Membership request rejected
            </span>
          )}

          {!membershipStatus && (
            <span className="rounded-lg border border-white/30 px-4 py-3 text-sm font-semibold">
              Group information
            </span>
          )}
        </div>

        {isPending && (
          <p className="mt-4 text-sm text-white/80">
            Your membership request is awaiting administrator review.
          </p>
        )}

        {!isMember && !isPending && !isRejected && (
          <p className="mt-4 text-sm text-white/80">
            You are viewing the public group information. Membership is
            required to access the group's activities and financial records.
          </p>
        )}
      </section>

      {/* Group navigation */}
      <nav
        aria-label="Group sections"
        className="flex gap-2 overflow-x-auto border-b border-border pb-2"
      >
        {visibleSections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            aria-current={
              activeSection === section.id ? 'page' : undefined
            }
            className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              activeSection === section.id
                ? 'bg-[#452044] text-white'
                : 'text-text-muted hover:bg-surface-secondary hover:text-text'
            }`}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {/* Overview */}
      {activeSection === 'overview' && (
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
                section. Cycle management and group archiving will be
                connected when their respective workflows are implemented.
              </p>

              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => setActiveSection('members')}
                >
                  Review membership requests
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
      )}

      {/* Members */}
      {isMember && activeSection === 'members' && (
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
                    {pendingMembersErrorDetails.response?.data?.detail ||
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
                  {membersErrorDetails.response?.data?.detail ||
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
      )}

      {/* Other member-only sections */}
      {isMember &&
        activeSection !== 'overview' &&
        activeSection !== 'members' &&
        currentSection && (
          <Card
            title={sectionDescriptions[activeSection].title}
            description={sectionDescriptions[activeSection].description}
          >
            <div className="rounded-xl border border-border bg-surface-secondary p-5">
              <p className="font-semibold text-text">
                {isAdmin ? 'Administrator access' : 'Member access'}
              </p>

              <p className="mt-2 text-sm leading-6 text-text-muted">
                {sectionDescriptions[activeSection].description}
              </p>

              <p className="mt-3 text-sm text-text-muted">
                This section is ready for its live backend data and actions.
                No sample financial or membership records are being displayed.
              </p>
            </div>
          </Card>
        )}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/dashboard"
          className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-text transition hover:bg-surface"
        >
          Back to dashboard
        </Link>

        <Link
          to="/profile"
          className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-text transition hover:bg-surface"
        >
          My profile
        </Link>
      </div>
    </div>
  )
}