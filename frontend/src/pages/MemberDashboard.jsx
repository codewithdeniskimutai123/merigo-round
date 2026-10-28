
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card.jsx'

const initialGroups = [
  {
    id: 1,
    name: 'Eldoret Women Investment Group',
    description: 'A community savings group focused on consistent contributions.',
    contributionAmount: 5000,
    frequency: 'Monthly',
    members: 12,
    capacity: 20,
    status: 'Active',
    joiningMode: 'direct',
    cycle: 'Cycle 2',
    joined: true,
  },
  {
    id: 2,
    name: 'Uasin Gishu Savings Circle',
    description: 'Members save together and follow an organized payout schedule.',
    contributionAmount: 3000,
    frequency: 'Monthly',
    members: 15,
    capacity: 20,
    status: 'Active',
    joiningMode: 'request',
    cycle: 'Cycle 1',
    joined: false,
  },
  {
    id: 3,
    name: 'Baraton Community Circle',
    description: 'A savings community built around shared financial goals.',
    contributionAmount: 2000,
    frequency: 'Weekly',
    members: 8,
    capacity: 15,
    status: 'Active',
    joiningMode: 'direct',
    cycle: 'Not started',
    joined: false,
  },
  {
    id: 4,
    name: 'Eldoret Future Builders',
    description: 'A group planning its next savings cycle.',
    contributionAmount: 4000,
    frequency: 'Monthly',
    members: 10,
    capacity: 20,
    status: 'Inactive',
    joiningMode: 'request',
    cycle: 'Not started',
    joined: false,
  },
]

export default function MemberDashboard() {
  const [groups, setGroups] = useState(initialGroups)
  const [requests, setRequests] = useState([])
  const [notice, setNotice] = useState('')

  const joinedGroups = groups.filter((group) => group.joined)
  const availableGroups = groups.filter(
    (group) => !group.joined && group.status === 'Active',
  )

  function handleJoin(group) {
    if (group.status !== 'Active') {
      setNotice('This group is not currently accepting members.')
      return
    }

    if (group.joiningMode === 'request') {
      setRequests((current) =>
        current.includes(group.id) ? current : [...current, group.id],
      )
      setNotice(`Your sample membership request for ${group.name} has been submitted.`)
      return
    }

    setGroups((current) =>
      current.map((item) =>
        item.id === group.id ? { ...item, joined: true, members: item.members + 1 } : item,
      ),
    )
    setNotice(`You have joined ${group.name} in this demo.`)
  }

  return (
      <div className="space-y-8">
        {notice && (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-text sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => setNotice('')}
              className="self-start font-semibold text-text underline underline-offset-4 sm:self-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="rounded-2xl bg-[#452044] p-6 text-white shadow-sm sm:p-8">
          <p className="text-sm text-white/75">Your savings community</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Welcome to your member dashboard
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
            Explore available groups, keep track of your contributions, and
            follow your group's payout schedule.
          </p>
          <a
            href="#available-groups"
            className="mt-6 inline-flex rounded-lg bg-[#C5A15B] px-5 py-3 text-sm font-semibold text-[#32172F] transition hover:bg-[#D5B574] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#452044]"
          >
            Explore groups
          </a>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card title="My groups">
            <p className="text-3xl font-bold text-text">{joinedGroups.length}</p>
            <p className="mt-1 text-sm text-text-muted">
              Groups you have joined
            </p>
          </Card>

          <Card title="Available groups">
            <p className="text-3xl font-bold text-text">
              {availableGroups.length}
            </p>
            <p className="mt-1 text-sm text-text-muted">
              Active joining opportunities
            </p>
          </Card>

          <Card title="Pending requests">
            <p className="text-3xl font-bold text-text">{requests.length}</p>
            <p className="mt-1 text-sm text-text-muted">
              Sample membership requests
            </p>
          </Card>

          <Card title="Contribution frequency">
            <p className="text-xl font-bold text-text">Group-based</p>
            <p className="mt-1 text-sm text-text-muted">
              See the schedule inside each group
            </p>
          </Card>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-text">My groups</h2>
            <p className="mt-1 text-sm text-text-muted">
              Open a group to view its members, cycles, contributions, and payout schedule.
            </p>
          </div>

          {joinedGroups.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {joinedGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  joined
                  requestPending={requests.includes(group.id)}
                  onJoin={handleJoin}
                />
              ))}
            </div>
          ) : (
            <Card title="You have not joined a group yet">
              <p className="text-sm text-text-muted">
                Explore the available groups below and join one or request membership.
              </p>
            </Card>
          )}
        </section>

        <section id="available-groups" className="scroll-mt-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-text">Available groups</h2>
            <p className="mt-1 text-sm text-text-muted">
              Find a group that suits your contribution budget and schedule.
            </p>
          </div>

          {availableGroups.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {availableGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  joined={false}
                  requestPending={requests.includes(group.id)}
                  onJoin={handleJoin}
                />
              ))}
            </div>
          ) : (
            <Card title="You are all caught up">
              <p className="text-sm text-text-muted">
                There are no additional active groups available in this demo.
                Check back when more groups are listed.
              </p>
            </Card>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-text">Other groups</h2>
            <p className="mt-1 text-sm text-text-muted">
              These groups are not currently accepting new members.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {groups
              .filter((group) => group.status !== 'Active' && !group.joined)
              .map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  joined={false}
                  requestPending={requests.includes(group.id)}
                  onJoin={handleJoin}
                />
              ))}
          </div>
        </section>

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

        <p className="text-xs leading-5 text-text-muted">
          Demo mode: the groups and actions on this page use sample data held
          in the browser. They do not create real memberships or submit real
          payment requests.
        </p>
      </div>

  )
}

function GroupCard({ group, joined, requestPending, onJoin }) {
  const isActive = group.status === 'Active'

  return (
    <article className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-text">{group.name}</h3>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            {group.description}
          </p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isActive
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-surface-secondary text-text-muted'
          }`}
        >
          {group.status}
        </span>
      </div>

      <div className="my-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-secondary p-3">
          <p className="text-xs text-text-muted">Contribution</p>
          <p className="mt-1 font-bold text-text">
            KSh {group.contributionAmount.toLocaleString('en-KE')}
          </p>
        </div>
        <div className="rounded-xl bg-surface-secondary p-3">
          <p className="text-xs text-text-muted">Frequency</p>
          <p className="mt-1 font-bold text-text">{group.frequency}</p>
        </div>
        <div className="rounded-xl bg-surface-secondary p-3">
          <p className="text-xs text-text-muted">Members</p>
          <p className="mt-1 font-bold text-text">
            {group.members} / {group.capacity}
          </p>
        </div>
        <div className="rounded-xl bg-surface-secondary p-3">
          <p className="text-xs text-text-muted">Current cycle</p>
          <p className="mt-1 font-bold text-text">{group.cycle}</p>
        </div>
      </div>

      {joined && (
        <p className="mb-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          You are a member of this group.
        </p>
      )}

      {!joined && requestPending && (
        <p className="mb-4 text-sm font-medium text-text-muted">
          Membership request submitted in this demo.
        </p>
      )}

      <div className="mt-auto flex flex-wrap gap-3">
        <Link
          to={`/groups/${group.id}`}
          className="inline-flex flex-1 items-center justify-center rounded-lg bg-[#452044] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#32172F] focus:outline-none focus:ring-2 focus:ring-[#C5A15B] focus:ring-offset-2"
        >
          {joined ? 'Open group' : 'View group'}
        </Link>

        {!joined && !requestPending && (
          <button
            type="button"
            disabled={!isActive || group.members >= group.capacity}
            onClick={() => onJoin(group)}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-semibold text-text transition hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-[#C5A15B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!isActive
              ? 'Joining unavailable'
              : group.members >= group.capacity
                ? 'Group full'
                : group.joiningMode === 'request'
                  ? 'Request to join'
                  : 'Join group'}
          </button>
        )}
      </div>
    </article>
  )
}
