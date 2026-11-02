
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card.jsx'
import { useGroups, usePendingGroupMembers } from '../hooks/useGroups.js'

export default function MemberDashboard() {
  const { data, isLoading, isError, error, isFetching, refetch } =
    useGroups()

  const [username, setUsername] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.username || ''
    } catch {
      return ''
    }
  })

  useEffect(() => {
    function updateUser() {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        setUsername(user.username || '')
      } catch {
        setUsername('')
      }
    }

    window.addEventListener('auth-change', updateUser)

    return () => {
      window.removeEventListener('auth-change', updateUser)
    }
  }, [])

  const groups = useMemo(() => {
    if (Array.isArray(data)) return data
    return data?.results || []
  }, [data])

  const canRequestMembership = (status) =>
    !status || ['CANCELLED', 'LEFT', 'REMOVED'].includes(status)

  const joinedGroups = groups.filter(
    (group) => group.user_membership_status === 'ACTIVE',
  )

  const pendingGroups = groups.filter(
    (group) => group.user_membership_status === 'PENDING',
  )

  const adminGroups = joinedGroups.filter(
    (group) => group.user_membership_role === 'ADMIN',
  )

  const availableGroups = groups.filter(
    (group) =>
      group.status === 'ACTIVE' &&
      canRequestMembership(group.user_membership_status),
  )

  const otherGroups = groups.filter(
    (group) =>
      group.status !== 'ACTIVE' &&
      canRequestMembership(group.user_membership_status),
  )

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-[#452044] p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm text-white/75">
          Your savings community
        </p>

        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
          Hello, {username || 'there'}
        </h2>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
          Manage your savings groups, follow your membership
          requests, and stay informed about your group activities.
        </p>

        <a
          href="#available-groups"
          className="mt-6 inline-flex rounded-lg bg-[#C5A15B] px-5 py-3 text-sm font-semibold text-[#32172F] transition hover:bg-[#D5B574] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#452044]"
        >
          Explore groups
        </a>

        <Link
          to="/groups/create"
          className="mt-3 inline-flex rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:ml-3"
        >
          Create a group
        </Link>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="My groups">
          <p className="text-3xl font-bold text-text">
            {isLoading ? '—' : joinedGroups.length}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Groups where you are an active member
          </p>
        </Card>

        <Card title="Available groups">
          <p className="text-3xl font-bold text-text">
            {isLoading ? '—' : availableGroups.length}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Active groups you can explore
          </p>
        </Card>

        <Card title="My pending requests">
          <p className="text-3xl font-bold text-text">
            {isLoading ? '—' : pendingGroups.length}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Requests you have submitted and are awaiting approval
          </p>
        </Card>

        <Card title="Your group role">
          <p className="text-xl font-bold text-text">
            {adminGroups.length > 0 ? 'Administrator' : 'Member'}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Your role may differ between groups
          </p>
        </Card>
      </section>

      {isFetching && !isLoading && (
        <p className="text-sm text-text-muted">
          Updating your groups...
        </p>
      )}

      {isLoading && (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-12 text-center">
          <div
            className="h-9 w-9 animate-spin rounded-full border-4 border-border border-t-[#452044]"
            role="status"
            aria-label="Loading groups"
          />
          <p className="mt-4 font-semibold text-text">
            Loading your groups
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Please wait while we retrieve your group information.
          </p>
        </section>
      )}

      {isError && !isLoading && (
        <section
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/30"
        >
          <h2 className="font-bold text-red-800 dark:text-red-300">
            Unable to load your groups
          </h2>

          <p className="mt-2 text-sm text-red-700 dark:text-red-300">
            {error?.response?.data?.detail ||
              'Something went wrong while retrieving your groups. Please try again.'}
          </p>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-4 rounded-lg bg-[#452044] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#32172F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFetching ? 'Retrying...' : 'Try again'}
          </button>
        </section>
      )}

      {!isLoading && !isError && (
        <>
          <GroupSection
            title="My groups"
            description="Open a group to view its members, contributions, cycles, and payout schedule."
            groups={joinedGroups}
            emptyTitle="You have not joined a group yet"
            emptyMessage="Explore the available groups below to find a savings community."
          />

          <GroupSection
            title="My pending join requests"
            description="These are groups you have requested to join and are awaiting an administrator's decision."
            groups={pendingGroups}
            emptyTitle="No pending join requests"
            emptyMessage="You do not have any membership requests awaiting approval."
            pending
          />

          {adminGroups.length > 0 && (
            <AdminMembershipRequests groups={adminGroups} />
          )}

          <section
            id="available-groups"
            className="scroll-mt-6 space-y-4"
          >
            <div>
              <h2 className="text-xl font-bold text-text">
                Available groups
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Explore active groups and find one that suits your contribution budget.
              </p>
            </div>

            {availableGroups.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {availableGroups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            ) : (
              <Card title="No available groups">
                <p className="text-sm text-text-muted">
                  There are currently no additional active groups to explore.
                  Check back later for new opportunities.
                </p>
              </Card>
            )}
          </section>

          {otherGroups.length > 0 && (
            <section className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-text">
                  Other groups
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  These groups are not currently active or accepting new members.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {otherGroups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section>
        <Card title="Your account">
          <p className="text-sm text-text-muted">
            Keep your contact details and account security up to date.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/profile"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-surface"
            >
              View profile
            </Link>

            <Link
              to="/settings"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-surface"
            >
              Settings
            </Link>

            <Link
              to="/change-password"
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-surface"
            >
              Change password
            </Link>
          </div>
        </Card>
      </section>
    </div>
  )
}

function AdminMembershipRequests({ groups }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-text">
          Membership requests to approve
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          Review people who have requested to join the groups you administer.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {groups.map((group) => (
          <AdminGroupRequestCard key={group.id} group={group} />
        ))}
      </div>
    </section>
  )
}

function AdminGroupRequestCard({ group }) {
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = usePendingGroupMembers(group.id)

  const pendingMembers = useMemo(() => {
    if (Array.isArray(data)) return data
    return data?.results || []
  }, [data])

  return (
    <Card title={group.name}>
      {isLoading ? (
        <p className="text-sm text-text-muted">
          Loading membership requests...
        </p>
      ) : isError ? (
        <div>
          <p className="text-sm text-red-600">
            {error?.response?.data?.detail ||
              'Unable to retrieve membership requests.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="mt-3 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-secondary disabled:opacity-50"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          <p className="text-3xl font-bold text-text">
            {pendingMembers.length}
          </p>

          <p className="mt-1 text-sm text-text-muted">
            {pendingMembers.length === 1
              ? 'Person awaiting your approval'
              : 'People awaiting your approval'}
          </p>

          <Link
            to={`/groups/${group.id}`}
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#452044] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#32172F] focus:outline-none focus:ring-2 focus:ring-[#C5A15B] focus:ring-offset-2"
          >
            Review group requests
          </Link>
        </>
      )}
    </Card>
  )
}

function GroupSection({
  title,
  description,
  groups,
  emptyTitle,
  emptyMessage,
  pending = false,
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-text">
          {title}
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {description}
        </p>
      </div>

      {groups.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              pending={pending}
            />
          ))}
        </div>
      ) : (
        <Card title={emptyTitle}>
          <p className="text-sm text-text-muted">
            {emptyMessage}
          </p>
        </Card>
      )}
    </section>
  )
}

function GroupCard({ group, pending = false }) {
  const isActive = group.status === 'ACTIVE'

  const frequencyLabels = {
    WEEKLY: 'Weekly',
    BIWEEKLY: 'Every two weeks',
    MONTHLY: 'Monthly',
  }

  const statusLabels = {
    DRAFT: 'Draft',
    ACTIVE: 'Active',
    PAUSED: 'Paused',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    ARCHIVED: 'Archived',
  }

  const roleLabels = {
    ADMIN: 'Administrator',
    TREASURER: 'Treasurer',
    SECRETARY: 'Secretary',
    MEMBER: 'Member',
  }

  const contribution = Number(group.contribution_amount || 0)

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-text">
            {group.name}
          </h3>

          <p className="mt-2 text-sm leading-6 text-text-muted">
            {group.description || 'No group description provided.'}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isActive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-surface-secondary text-text-muted'
          }`}
        >
          {statusLabels[group.status] || group.status}
        </span>
      </div>

      <div className="my-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-secondary p-3">
          <p className="text-xs text-text-muted">
            Contribution
          </p>
          <p className="mt-1 font-bold text-text">
            KSh {contribution.toLocaleString('en-KE')}
          </p>
        </div>

        <div className="rounded-xl bg-surface-secondary p-3">
          <p className="text-xs text-text-muted">
            Frequency
          </p>
          <p className="mt-1 font-bold text-text">
            {frequencyLabels[group.frequency] || group.frequency}
          </p>
        </div>

        <div className="rounded-xl bg-surface-secondary p-3">
          <p className="text-xs text-text-muted">
            Maximum members
          </p>
          <p className="mt-1 font-bold text-text">
            {group.max_members}
          </p>
        </div>

        <div className="rounded-xl bg-surface-secondary p-3">
          <p className="text-xs text-text-muted">
            Start date
          </p>
          <p className="mt-1 font-bold text-text">
            {group.start_date || 'Not set'}
          </p>
        </div>
      </div>

      {group.user_membership_status === 'ACTIVE' && (
        <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          You are an active {roleLabels[group.user_membership_role] || 'member'} of this group.
        </p>
      )}

      {pending && (
        <p className="mb-4 text-sm font-medium text-text-muted">
          Your membership request is awaiting approval.
        </p>
      )}

      <div className="mt-auto">
        <Link
          to={`/groups/${group.id}`}
          className="inline-flex w-full items-center justify-center rounded-lg bg-[#452044] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#32172F] focus:outline-none focus:ring-2 focus:ring-[#C5A15B] focus:ring-offset-2"
        >
          {pending ? 'View group' : 'Open group'}
        </Link>
      </div>
    </article>
  )
}
