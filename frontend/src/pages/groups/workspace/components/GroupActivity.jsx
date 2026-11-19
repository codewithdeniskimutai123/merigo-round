
import { useEffect, useState } from 'react'

import Card from '../../../../components/Card.jsx'
import Button from '../../../../components/Button.jsx'
import { useGroupActivity } from '../../../../hooks/useGroups.js'
import { formatDateTime } from '../utils/groupWorkspaceUtils.js'

const PAGE_SIZE = 20

const activityCategories = [
  { value: 'all', label: 'All activity' },
  { value: 'MEMBERSHIP', label: 'Membership' },
  { value: 'CONTRIBUTION', label: 'Contributions' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'CYCLE', label: 'Cycles' },
  { value: 'ROUND', label: 'Rounds' },
  { value: 'DRAW', label: 'Draws' },
  { value: 'SWAP', label: 'Position swaps' },
  { value: 'PAYOUT', label: 'Payouts' },
  { value: 'GROUP', label: 'Group management' },
]

function getActorName(activity) {
  const fullName = [
    activity.actor_first_name,
    activity.actor_last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || activity.actor_username || 'System'
}

function getCategoryLabel(category) {
  return (
    activityCategories.find((item) => item.value === category)?.label ||
    category
  )
}

function ActivityLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#452044] border-t-transparent" />
      <p className="text-sm text-text-muted">
        Loading group activity...
      </p>
    </div>
  )
}

export default function GroupActivity({ groupId }) {
  const [category, setCategory] = useState('all')
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    setOffset(0)
  }, [category, groupId])

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGroupActivity(
    groupId,
    {
      category,
      limit: PAGE_SIZE,
      offset,
    },
  )

  const activities = data?.results || []
  const total = data?.total ?? 0
  const nextOffset = data?.next_offset

  function handleCategoryChange(event) {
    setCategory(event.target.value)
  }

  function handlePreviousPage() {
    setOffset((current) => Math.max(0, current - PAGE_SIZE))
  }

  function handleNextPage() {
    if (nextOffset !== null && nextOffset !== undefined) {
      setOffset(nextOffset)
    }
  }

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <Card
      title="Group activity"
      description="A timeline of important membership, contribution, cycle and payout activities."
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-text">
              Activity timeline
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {total} {total === 1 ? 'activity' : 'activities'} recorded
            </p>
          </div>

          <div className="w-full sm:w-56">
            <label
              htmlFor="activity-category"
              className="mb-1.5 block text-sm font-medium text-text-muted"
            >
              Filter activity
            </label>

            <select
              id="activity-category"
              value={category}
              onChange={handleCategoryChange}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-[#452044]"
            >
              {activityCategories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <ActivityLoadingState />
        ) : isError ? (
          <div className="rounded-xl border border-border bg-surface-secondary p-5">
            <p className="font-semibold text-text">
              Unable to load group activity
            </p>

            <p className="mt-2 text-sm text-text-muted">
              {error.response?.data?.detail ||
                'We could not retrieve the activity timeline. Please try again.'}
            </p>

            <div className="mt-4">
              <Button
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? 'Trying again...' : 'Try again'}
              </Button>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-secondary px-5 py-10 text-center">
            <p className="font-semibold text-text">
              No activity found
            </p>

            <p className="mt-2 text-sm text-text-muted">
              {category === 'all'
                ? 'Important group activities will appear here as members use the group.'
                : 'There are no recorded activities in this category yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className="relative flex gap-4 pb-6 last:pb-0"
              >
                <div className="flex flex-col items-center">
                  <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#452044]" />

                  {index !== activities.length - 1 && (
                    <div className="mt-2 w-px flex-1 bg-border" />
                  )}
                </div>

                <div className="min-w-0 flex-1 rounded-xl border border-border bg-surface p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-text">
                        {activity.description}
                      </p>

                      <p className="mt-1 text-sm text-text-muted">
                        By {getActorName(activity)}
                      </p>
                    </div>

                    <span className="w-fit shrink-0 rounded-full bg-surface-secondary px-3 py-1 text-xs font-medium text-text-muted">
                      {getCategoryLabel(activity.category)}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-text-muted">
                    {formatDateTime(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && total > PAGE_SIZE && (
          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-muted">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={handlePreviousPage}
                disabled={offset === 0 || isFetching}
              >
                Previous
              </Button>

              <Button
                onClick={handleNextPage}
                disabled={
                  nextOffset === null ||
                  nextOffset === undefined ||
                  isFetching
                }
              >
                {isFetching ? 'Loading...' : 'Next'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
