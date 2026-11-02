
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import {
  useGroup,
  useGroupMembers,
  usePendingGroupMembers,
  useRequestToJoinGroup,
  useCancelGroupJoinRequest,
  useApproveGroupMember,
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

function PendingMemberCard({ member, onApprove, approving }) {
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

        <div className="pt-3">
          <Button
            onClick={onApprove}
            disabled={approving}
          >
            {approving ? 'Approving...' : 'Approve member'}
          </Button>
        </div>
      </div>
    </article>
  )
}

export default function GroupWorkspace() {
  const { id } = useParams()
  const [activeSection, setActiveSection] = useState('overview')

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

  const requestJoinMutation = useRequestToJoinGroup(id)
  const cancelJoinMutation = useCancelGroupJoinRequest(id)
  const approveMemberMutation = useApproveGroupMember(id)

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
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
            >
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
  const isActiveGroup = group.status === 'ACTIVE'

  const canRequestMembership =
    !membershipStatus ||
    ['LEFT', 'REMOVED', 'CANCELLED'].includes(membershipStatus)

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

        {!isMember && !isPending && (
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
              ) : canRequestMembership ? (
                <div className="space-y-3">
                  <p className="text-sm text-text-muted">
                    You can request membership if this group is accepting
                    new members.
                  </p>

                  <Button
                    onClick={() => requestJoinMutation.mutate()}
                    disabled={
                      !isActiveGroup || requestJoinMutation.isPending
                    }
                  >
                    {requestJoinMutation.isPending
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
                      {pendingMembersFetching ? 'Refreshing...' : 'Refresh requests'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {pendingMembers.map((member) => (
                      <PendingMemberCard
                        key={member.id}
                        member={member}
                        onApprove={() => approveMemberMutation.mutate(member.id)}
                        approving={approveMemberMutation.isPending}
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
                {isAdmin
                  ? 'Administrator access'
                  : 'Member access'}
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
