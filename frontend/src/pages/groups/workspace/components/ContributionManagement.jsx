
import { useEffect, useMemo, useState } from 'react'

import Card from '../../../../components/Card.jsx'
import Button from '../../../../components/Button.jsx'

import { useGroupCycles } from '../../../../hooks/useCycles.js'
import { useCycleContributions } from '../../../../hooks/useContributions.js'

import {
  formatAmount,
  formatDate,
  formatDateTime,
} from '../utils/groupWorkspaceUtils.js'

const statusStyles = {
  PAID: 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300',
  PARTIALLY_PAID:
    'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  PENDING:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  OVERDUE:
    'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300',
  WAIVED:
    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
}

function getBalance(contribution) {
  if (contribution.balance !== undefined && contribution.balance !== null) {
    return Math.max(Number(contribution.balance), 0)
  }

  return Math.max(
    Number(contribution.amount_due || 0) -
      Number(contribution.amount_paid || 0) -
      Number(contribution.amount_waived || 0),
    0,
  )
}

function getMemberName(contribution) {
  const member = contribution.member_details

  if (!member) return 'Unknown member'

  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()

  return fullName || member.username || 'Unknown member'
}

function getStatusLabel(status) {
  return String(status || 'PENDING').replaceAll('_', ' ')
}

function isOwnContribution(contribution, currentUser, isAdmin) {
  // Ordinary members only receive their own contribution records
  // from the backend endpoint.
  if (!isAdmin) return true

  // For administrators, allow payment actions only on their own records.
  const contributionMemberId =
    typeof contribution.member === 'object'
      ? contribution.member?.id
      : contribution.member

  const memberId =
    contributionMemberId ?? contribution.member_details?.id

  if (currentUser?.id == null || memberId == null) {
    return false
  }

  return String(memberId) === String(currentUser.id)
}

function getActionLabel(contribution, currentUser, isAdmin) {
  const isClosed = ['PAID', 'WAIVED'].includes(contribution.status)
  const isOwn = isOwnContribution(contribution, currentUser, isAdmin)

  return !isClosed && isOwn ? 'View and Pay' : 'View'
}

function SummaryCard({ title, amount, description }) {
  return (
    <Card title={title}>
      <p className="text-2xl font-bold text-text">
        KSh {formatAmount(amount)}
      </p>

      <p className="mt-1 text-sm text-text-muted">
        {description}
      </p>
    </Card>
  )
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        statusStyles[status] || statusStyles.PENDING
      }`}
    >
      {getStatusLabel(status)}
    </span>
  )
}

function ContributionManagement({
  groupId,
  group,
  isAdmin,
  currentUser,
  onOpenContribution,
  onViewPaymentHistory,
}) {
  const [selectedCycleId, setSelectedCycleId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const {
    data: cyclesData,
    isLoading: cyclesLoading,
    isError: cyclesError,
    refetch: refetchCycles,
    isFetching: cyclesFetching,
  } = useGroupCycles(groupId)

  const cycles = Array.isArray(cyclesData)
    ? cyclesData
    : cyclesData?.cycles || cyclesData?.results || []

  useEffect(() => {
    if (!cycles.length) {
      setSelectedCycleId('')
      return
    }

    const selectedCycleExists = cycles.some(
      (cycle) => String(cycle.id) === String(selectedCycleId),
    )

    if (!selectedCycleExists) {
      setSelectedCycleId(String(cycles[0].id))
    }
  }, [cycles, selectedCycleId])

  const {
    data: contributionData,
    isLoading: contributionsLoading,
    isError: contributionsError,
    error: contributionsErrorDetails,
    refetch: refetchContributions,
    isFetching: contributionsFetching,
  } = useCycleContributions(groupId, selectedCycleId)

  const contributions = contributionData?.contributions || []

  const visibleRecords = useMemo(() => {
    let records = contributions

    if (statusFilter !== 'ALL') {
      records = records.filter(
        (item) => item.status === statusFilter,
      )
    }

    if (search.trim()) {
      const query = search.trim().toLowerCase()

      records = records.filter((item) => {
        const memberName = getMemberName(item).toLowerCase()
        const roundLabel = `round ${item.round_number}`.toLowerCase()

        return (
          memberName.includes(query) ||
          roundLabel.includes(query)
        )
      })
    }

    return records
  }, [contributions, search, statusFilter])

  const totalDue = contributions.reduce(
    (total, item) => total + Number(item.amount_due || 0),
    0,
  )

  const totalPaid = contributions.reduce(
    (total, item) => total + Number(item.amount_paid || 0),
    0,
  )

  const totalWaived = contributions.reduce(
    (total, item) => total + Number(item.amount_waived || 0),
    0,
  )

  const outstanding = contributions.reduce(
    (total, item) => total + getBalance(item),
    0,
  )

  const overdue = contributions
    .filter((item) => item.status === 'OVERDUE')
    .reduce((total, item) => total + getBalance(item), 0)

  const selectedCycle = cycles.find(
    (cycle) => String(cycle.id) === String(selectedCycleId),
  )

  function handleOpenContribution(contribution) {
    if (!onOpenContribution || !selectedCycleId) return

    // Pass the selected cycle ID into ContributionDetail.
    // The waiver endpoint requires both the group ID and cycle ID.
    onOpenContribution({
      ...contribution,
      cycleId: selectedCycleId,
    })
  }

  function handleViewPaymentHistory() {
    if (onViewPaymentHistory) {
      onViewPaymentHistory()
    }
  }

  if (cyclesLoading) {
    return (
      <Card title="Contributions" description="Loading available cycles...">
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#452044] border-t-transparent" />
        </div>
      </Card>
    )
  }

  if (cyclesError) {
    return (
      <Card
        title="Unable to load cycles"
        description="We could not retrieve the group's cycles."
      >
        <Button onClick={() => refetchCycles()} disabled={cyclesFetching}>
          {cyclesFetching ? 'Trying again...' : 'Try again'}
        </Button>
      </Card>
    )
  }

  if (cycles.length === 0) {
    return (
      <Card
        title="Contributions"
        description={group?.name || 'Group contributions'}
      >
        <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center">
          <h3 className="font-semibold text-text">
            No cycles available
          </h3>

          <p className="mt-2 text-sm text-text-muted">
            Contributions will appear here after a cycle has been created
            and activated.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-text-muted">
            {group?.name}
          </p>

          <h2 className="mt-1 text-xl font-bold text-text">
            {isAdmin ? 'Group contributions' : 'My contributions'}
          </h2>

          <p className="mt-1 text-sm leading-6 text-text-muted">
            {isAdmin
              ? 'Monitor member contributions, payments and outstanding balances across group rounds.'
              : 'Track your contribution obligations, payments and remaining balances.'}
          </p>
        </div>

        <Button onClick={handleViewPaymentHistory}>
          View payment history
        </Button>
      </div>

      <Card title="Select cycle">
        <label
          htmlFor="contribution-cycle"
          className="mb-2 block text-sm font-medium text-text"
        >
          Cycle
        </label>

        <select
          id="contribution-cycle"
          value={selectedCycleId}
          onChange={(event) => setSelectedCycleId(event.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition focus:border-[#452044] focus:ring-2 focus:ring-[#452044]/10 sm:max-w-md"
        >
          {cycles.map((cycle) => (
            <option key={cycle.id} value={String(cycle.id)}>
              Cycle {cycle.id} — {cycle.status}
            </option>
          ))}
        </select>

        {selectedCycle && (
          <p className="mt-2 text-sm text-text-muted">
            Viewing contributions for the selected cycle.
          </p>
        )}
      </Card>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title={isAdmin ? 'Total contributions due' : 'Total amount due'}
          amount={totalDue}
          description="Expected contributions"
        />

        <SummaryCard
          title="Amount collected"
          amount={totalPaid}
          description="Successfully recorded payments"
        />

        <SummaryCard
          title="Amount waived"
          amount={totalWaived}
          description="Contributions waived by administrators"
        />

        <SummaryCard
          title="Outstanding balance"
          amount={outstanding}
          description={`Overdue: KSh ${formatAmount(overdue)}`}
        />
      </section>

      <Card
        title={isAdmin ? 'Contribution records' : 'Your contribution records'}
        description={
          isAdmin
            ? 'Review individual member obligations and their payment progress.'
            : 'Review your contribution history and current payment obligations.'
        }
      >
        {contributionsLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#452044] border-t-transparent" />

            <p className="text-sm text-text-muted">
              Loading contributions...
            </p>
          </div>
        ) : contributionsError ? (
          <div className="rounded-xl border border-dashed border-border px-5 py-10 text-center">
            <h3 className="font-semibold text-text">
              Unable to load contributions
            </h3>

            <p className="mt-2 text-sm text-text-muted">
              {contributionsErrorDetails?.response?.data?.detail ||
                'We could not retrieve the contribution records.'}
            </p>

            <div className="mt-4">
              <Button
                onClick={() => refetchContributions()}
                disabled={contributionsFetching}
              >
                {contributionsFetching ? 'Trying again...' : 'Try again'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label
                  htmlFor="contribution-search"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  Search contributions
                </label>

                <input
                  id="contribution-search"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by member or round..."
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-[#452044] focus:ring-2 focus:ring-[#452044]/10"
                />
              </div>

              <div className="sm:w-56">
                <label
                  htmlFor="contribution-status"
                  className="mb-2 block text-sm font-medium text-text"
                >
                  Filter by status
                </label>

                <select
                  id="contribution-status"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text outline-none transition focus:border-[#452044] focus:ring-2 focus:ring-[#452044]/10"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIALLY_PAID">Partially paid</option>
                  <option value="PENDING">Pending</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="WAIVED">Waived</option>
                </select>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-text-muted">
                Showing {visibleRecords.length} contribution
                {visibleRecords.length === 1 ? '' : 's'}
              </p>
            </div>

            {visibleRecords.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center">
                <h3 className="font-semibold text-text">
                  No contributions found
                </h3>

                <p className="mt-2 text-sm text-text-muted">
                  Try changing your search or status filter.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[1100px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                        {isAdmin && (
                          <th className="px-3 py-4 font-semibold">Member</th>
                        )}

                        <th className="px-3 py-4 font-semibold">Round</th>
                        <th className="px-3 py-4 font-semibold">Amount due</th>
                        <th className="px-3 py-4 font-semibold">Amount paid</th>
                        <th className="px-3 py-4 font-semibold">Amount waived</th>
                        <th className="px-3 py-4 font-semibold">Balance</th>
                        <th className="px-3 py-4 font-semibold">Due date</th>
                        <th className="px-3 py-4 font-semibold">Status</th>
                        <th className="px-3 py-4 text-right font-semibold">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-border">
                      {visibleRecords.map((item) => (
                        <tr
                          key={item.id}
                          className="transition hover:bg-surface-secondary"
                        >
                          {isAdmin && (
                            <td className="px-3 py-4 font-medium text-text">
                              {getMemberName(item)}
                            </td>
                          )}

                          <td className="px-3 py-4 text-text">
                            Round {item.round_number}
                          </td>

                          <td className="px-3 py-4 text-text">
                            KSh {formatAmount(item.amount_due)}
                          </td>

                          <td className="px-3 py-4 text-text">
                            KSh {formatAmount(item.amount_paid)}
                          </td>

                          <td className="px-3 py-4 text-text">
                            KSh {formatAmount(item.amount_waived || 0)}
                          </td>

                          <td className="px-3 py-4 font-semibold text-text">
                            KSh {formatAmount(getBalance(item))}
                          </td>

                          <td className="px-3 py-4 text-text-muted">
                            {formatDate(item.due_date)}
                          </td>

                          <td className="px-3 py-4">
                            <StatusBadge status={item.status} />
                          </td>

                          <td className="px-3 py-4 text-right">
                            <Button
                              onClick={() => handleOpenContribution(item)}
                            >
                              {getActionLabel(item, currentUser, isAdmin)}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 lg:hidden">
                  {visibleRecords.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          {isAdmin && (
                            <p className="font-semibold text-text">
                              {getMemberName(item)}
                            </p>
                          )}

                          <p className="text-sm text-text-muted">
                            Round {item.round_number}
                          </p>
                        </div>

                        <StatusBadge status={item.status} />
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-text-muted">Amount due</p>
                          <p className="mt-1 font-semibold text-text">
                            KSh {formatAmount(item.amount_due)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-text-muted">Amount paid</p>
                          <p className="mt-1 font-semibold text-text">
                            KSh {formatAmount(item.amount_paid)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-text-muted">Amount waived</p>
                          <p className="mt-1 font-semibold text-text">
                            KSh {formatAmount(item.amount_waived || 0)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-text-muted">Balance</p>
                          <p className="mt-1 font-semibold text-text">
                            KSh {formatAmount(getBalance(item))}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-text-muted">Due date</p>
                          <p className="mt-1 font-medium text-text">
                            {formatDate(item.due_date)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-text-muted">Date paid</p>
                          <p className="mt-1 font-medium text-text">
                            {item.paid_at
                              ? formatDateTime(item.paid_at)
                              : 'Not paid yet'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-border pt-4">
                        <Button
                          block
                          onClick={() => handleOpenContribution(item)}
                        >
                          {getActionLabel(item, currentUser, isAdmin)}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Card>

      <div className="rounded-xl border border-border bg-surface-secondary p-5">
        <h3 className="font-semibold text-text">
          Understanding contribution statuses
        </h3>

        <div className="mt-4 flex flex-wrap gap-3">
          <StatusBadge status="PAID" />
          <StatusBadge status="PARTIALLY_PAID" />
          <StatusBadge status="PENDING" />
          <StatusBadge status="OVERDUE" />
          <StatusBadge status="WAIVED" />
        </div>

        <p className="mt-3 text-sm leading-6 text-text-muted">
          The outstanding balance is calculated after subtracting both
          successful payments and approved waivers from the amount due.
          A contribution is fully settled when its balance reaches zero.
        </p>
      </div>
    </div>
  )
}

export default ContributionManagement
