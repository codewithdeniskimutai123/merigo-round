
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageLayout from '../layouts/PageLayout.jsx'
import Card from '../components/Card.jsx'

const sampleGroups = {
  1: {
    id: 1,
    name: 'Eldoret Women Investment Group',
    description:
      'A community savings group focused on consistent contributions and transparent payouts.',
    contributionAmount: 5000,
    frequency: 'Monthly',
    members: 12,
    capacity: 20,
    status: 'Active',
    cycle: 'Cycle 2',
    cycleStatus: 'Active',
    joined: true,
    currentRound: 2,
    nextRecipient: 'Jane Wanjiku',
    payoutOrder: [
      { position: 1, name: 'Mary Chebet', status: 'Paid' },
      { position: 2, name: 'Jane Wanjiku', status: 'Current round' },
      { position: 3, name: 'Grace Akinyi', status: 'Upcoming' },
      { position: 4, name: 'Esther Naliaka', status: 'Upcoming' },
    ],
    hasPayoutStarted: true,
  },
  2: {
    id: 2,
    name: 'Uasin Gishu Savings Circle',
    description:
      'Members save together and follow an organized contribution and payout schedule.',
    contributionAmount: 3000,
    frequency: 'Monthly',
    members: 15,
    capacity: 20,
    status: 'Active',
    cycle: 'Cycle 1',
    cycleStatus: 'Active',
    joined: false,
    currentRound: 1,
    nextRecipient: 'Membership required',
    payoutOrder: [],
    hasPayoutStarted: false,
  },
  3: {
    id: 3,
    name: 'Baraton Community Circle',
    description:
      'A savings community built around shared financial goals and regular contributions.',
    contributionAmount: 2000,
    frequency: 'Weekly',
    members: 8,
    capacity: 15,
    status: 'Active',
    cycle: 'Not started',
    cycleStatus: 'Not started',
    joined: false,
    currentRound: 0,
    nextRecipient: 'Not scheduled',
    payoutOrder: [],
    hasPayoutStarted: false,
  },
  4: {
    id: 4,
    name: 'Eldoret Future Builders',
    description:
      'A community preparing for its next group savings cycle.',
    contributionAmount: 4000,
    frequency: 'Monthly',
    members: 10,
    capacity: 20,
    status: 'Inactive',
    cycle: 'Not started',
    cycleStatus: 'Not started',
    joined: false,
    currentRound: 0,
    nextRecipient: 'Not scheduled',
    payoutOrder: [],
    hasPayoutStarted: false,
  },
}

export default function GroupWorkspace() {
  const { id } = useParams()
  const group = sampleGroups[id]

  const [joined, setJoined] = useState(group?.joined ?? false)
  const [membershipRequest, setMembershipRequest] = useState('')
  const [leaveRequest, setLeaveRequest] = useState(false)
  const [notice, setNotice] = useState('')
  const [activeSection, setActiveSection] = useState('overview')

  if (!group) {
    return (
    
        <Card title="We could not find that group">
          <p className="text-sm text-text-muted">
            Return to the dashboard to choose one of the available sample groups.
          </p>
          <Link
            to="/dashboard"
            className="mt-4 inline-flex rounded-lg bg-[#452044] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#32172F]"
          >
            Back to dashboard
          </Link>
        </Card>
     
    )
  }

  const isActive = group.status === 'Active'
  const isFull = group.members >= group.capacity
  const canContribute = joined && group.cycleStatus === 'Active'
  const canRequestLeave = joined && !group.hasPayoutStarted

  function requestMembership() {
    if (!isActive || isFull) {
      setNotice('This group is not currently accepting new members.')
      return
    }

    setMembershipRequest('Pending')
    setNotice(
      'Your sample membership request has been submitted. An administrator would need to review it.',
    )
  }

  function joinGroup() {
    if (!isActive || isFull) {
      setNotice('This group is not currently accepting new members.')
      return
    }

    setJoined(true)
    setNotice('You joined this group in the demo. No backend record was created.')
  }

  function requestToLeave() {
    if (!canRequestLeave) {
      setNotice(
        'A leave request is unavailable because payouts have already started in this sample cycle.',
      )
      return
    }

    setLeaveRequest(true)
    setNotice(
      'Your sample leave request has been recorded locally. Administrator approval is still required.',
    )
  }

  function handleContribution() {
    setNotice(
      'Demo only: the real contribution flow will connect to the backend and M-Pesa STK Push.',
    )
  }

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: 'Members' },
    { id: 'contributions', label: 'Contributions' },
    { id: 'payouts', label: 'Payout schedule' },
    { id: 'cycles', label: 'Cycles and rounds' },
    { id: 'activity', label: 'Activity' },
  ]

  return (
   
      <div className="space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex text-sm font-semibold text-text-muted underline-offset-4 transition hover:text-text hover:underline"
        >
          Back to member dashboard
        </Link>

        {notice && (
          <div
            role="status"
            className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 text-sm text-text sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{notice}</p>
            <button
              type="button"
              onClick={() => setNotice('')}
              className="self-start font-semibold underline underline-offset-4 sm:self-auto"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="rounded-2xl bg-[#452044] p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm text-white/75">Group workspace</p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                {group.name}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/80">
                {group.description}
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                isActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-white/15 text-white'
              }`}
            >
              {group.status}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!joined && !membershipRequest && isActive && !isFull && (
              <>
                <button
                  type="button"
                  onClick={joinGroup}
                  className="rounded-lg bg-[#C5A15B] px-5 py-3 text-sm font-semibold text-[#32172F] transition hover:bg-[#D5B574] focus:outline-none focus:ring-2 focus:ring-white"
                >
                  Join group
                </button>
                <button
                  type="button"
                  onClick={requestMembership}
                  className="rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  Request to join
                </button>
              </>
            )}

            {!joined && membershipRequest === 'Pending' && (
              <span className="rounded-lg border border-white/30 px-4 py-3 text-sm font-semibold text-white">
                Membership request pending
              </span>
            )}

            {joined && (
              <span className="rounded-lg border border-white/30 px-4 py-3 text-sm font-semibold text-white">
                You are a group member
              </span>
            )}
          </div>

          {!joined && (!isActive || isFull) && (
            <p className="mt-4 text-sm text-white/80">
              {!isActive
                ? 'This group is not currently accepting members.'
                : 'This group has reached its member limit.'}
            </p>
          )}
        </section>

        <nav
          aria-label="Group sections"
          className="flex gap-2 overflow-x-auto border-b border-border pb-2"
        >
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              aria-current={activeSection === section.id ? 'page' : undefined}
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

        {activeSection === 'overview' && (
          <div className="space-y-6">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card title="Contribution amount">
                <p className="text-2xl font-bold text-text">
                  KSh {group.contributionAmount.toLocaleString('en-KE')}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {group.frequency}
                </p>
              </Card>

              <Card title="Group members">
                <p className="text-2xl font-bold text-text">
                  {group.members} / {group.capacity}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  Current sample membership
                </p>
              </Card>

              <Card title="Current cycle">
                <p className="text-2xl font-bold text-text">{group.cycle}</p>
                <p className="mt-1 text-sm text-text-muted">
                  {group.cycleStatus}
                </p>
              </Card>

              <Card title="Next payout recipient">
                <p className="text-lg font-bold text-text">
                  {joined ? group.nextRecipient : 'Members only'}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  Based on sample round order
                </p>
              </Card>
            </section>

            <Card title="Group information">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-text-muted">Contribution frequency</dt>
                  <dd className="mt-1 font-semibold text-text">{group.frequency}</dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Membership</dt>
                  <dd className="mt-1 font-semibold text-text">
                    {joined ? 'Joined' : membershipRequest || 'Not a member'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Cycle status</dt>
                  <dd className="mt-1 font-semibold text-text">{group.cycleStatus}</dd>
                </div>
                <div>
                  <dt className="text-sm text-text-muted">Group capacity</dt>
                  <dd className="mt-1 font-semibold text-text">
                    {group.capacity} members
                  </dd>
                </div>
              </dl>
            </Card>

            {joined && (
              <Card title="Membership options">
                <p className="text-sm leading-6 text-text-muted">
                  You can request to leave when the cycle rules permit it.
                  Requests require the appropriate approval; membership should
                  not be removed immediately.
                </p>

                {group.hasPayoutStarted ? (
                  <p className="mt-4 rounded-lg bg-surface-secondary p-3 text-sm text-text-muted">
                    Leave requests are unavailable in this sample because a
                    payout has already started in the current cycle.
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={leaveRequest}
                    onClick={requestToLeave}
                    className="mt-4 rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    {leaveRequest ? 'Leave request submitted' : 'Request to leave group'}
                  </button>
                )}
              </Card>
            )}
          </div>
        )}

        {activeSection === 'members' && (
          <Card title="Group members">
            {joined ? (
              <>
                <p className="mb-4 text-sm text-text-muted">
                  Sample member list for {group.name}.
                </p>
                <div className="divide-y divide-border">
                  {[
                    { name: 'Mary Chebet', role: 'Group administrator' },
                    { name: 'Jane Wanjiku', role: 'Member' },
                    { name: 'Grace Akinyi', role: 'Member' },
                    { name: 'Esther Naliaka', role: 'Member' },
                  ].map((member) => (
                    <div
                      key={member.name}
                      className="flex flex-wrap items-center justify-between gap-2 py-4"
                    >
                      <span className="font-medium text-text">{member.name}</span>
                      <span className="text-sm text-text-muted">{member.role}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-text-muted">
                  This is a sample list, not the complete live membership record.
                </p>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                Join this group to access its member information.
              </p>
            )}
          </Card>
        )}

        {activeSection === 'contributions' && (
          <Card title="Contributions">
            {joined ? (
              <div className="space-y-4">
                <p className="text-sm leading-6 text-text-muted">
                  The contribution amount for this group is KSh{' '}
                  {group.contributionAmount.toLocaleString('en-KE')} per{' '}
                  {group.frequency.toLowerCase()} period.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-left text-sm">
                    <thead className="border-b border-border text-text-muted">
                      <tr>
                        <th className="py-3 pr-4 font-medium">Period</th>
                        <th className="py-3 pr-4 font-medium">Amount</th>
                        <th className="py-3 font-medium">Sample status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="py-4 pr-4 text-text">Period 1</td>
                        <td className="py-4 pr-4 text-text">
                          KSh {group.contributionAmount.toLocaleString('en-KE')}
                        </td>
                        <td className="py-4 text-text-muted">Confirmed (demo)</td>
                      </tr>
                      <tr>
                        <td className="py-4 pr-4 text-text">Current period</td>
                        <td className="py-4 pr-4 text-text">
                          KSh {group.contributionAmount.toLocaleString('en-KE')}
                        </td>
                        <td className="py-4 text-text-muted">Awaiting payment (demo)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  disabled={!canContribute}
                  onClick={handleContribution}
                  className="rounded-lg bg-[#452044] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#32172F] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue to contribution
                </button>
                <p className="text-xs text-text-muted">
                  No payment will be made from this demo button.
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                Membership is required to view your contributions.
              </p>
            )}
          </Card>
        )}

        {activeSection === 'payouts' && (
          <Card title="Payout schedule">
            {joined ? (
              group.payoutOrder.length > 0 ? (
                <div className="space-y-3">
                  {group.payoutOrder.map((round) => (
                    <div
                      key={round.position}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
                    >
                      <div>
                        <p className="font-semibold text-text">
                          Round {round.position}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">{round.name}</p>
                      </div>
                      <span className="rounded-full bg-surface-secondary px-3 py-1.5 text-xs font-semibold text-text">
                        {round.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  A payout order has not been created for this sample group yet.
                </p>
              )
            ) : (
              <p className="text-sm text-text-muted">
                Join this group to view its payout schedule.
              </p>
            )}
          </Card>
        )}

        {activeSection === 'cycles' && (
          <Card title="Cycles and rounds">
            {joined ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm text-text-muted">Current cycle</p>
                  <p className="mt-1 text-lg font-bold text-text">{group.cycle}</p>
                  <p className="mt-2 text-sm text-text-muted">
                    Cycle status: {group.cycleStatus}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm text-text-muted">Current round</p>
                  <p className="mt-1 text-lg font-bold text-text">
                    {group.currentRound > 0
                      ? `Round ${group.currentRound}`
                      : 'Not scheduled'}
                  </p>
                </div>
                <p className="text-xs text-text-muted">
                  The real cycle and round details will come from the backend.
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                Join this group to view its cycle details.
              </p>
            )}
          </Card>
        )}

        {activeSection === 'activity' && (
          <Card title="Group activity">
            {joined ? (
              <div className="space-y-4">
                {[
                  ['Membership', 'Your sample membership is active.'],
                  ['Contributions', 'Contribution history is shown as demo data.'],
                  ['Payouts', 'The payout schedule follows the sample round order.'],
                ].map(([title, description]) => (
                  <div
                    key={title}
                    className="border-l-2 border-[#C5A15B] py-1 pl-4"
                  >
                    <p className="font-semibold text-text">{title}</p>
                    <p className="mt-1 text-sm text-text-muted">{description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">
                Join this group to view its activity.
              </p>
            )}
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

        <p className="text-xs leading-5 text-text-muted">
          Demo mode: group membership, requests, contributions, and payout
          records are sample data held in the frontend. They do not update
          your Django database or initiate M-Pesa transactions.
        </p>
      </div>
   
  )
}
