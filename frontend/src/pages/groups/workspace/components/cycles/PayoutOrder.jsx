
import Card from '../../../../../components/Card.jsx'
import Button from '../../../../../components/Button.jsx'

function getMemberName(member) {
  const fullName = [
    member?.first_name,
    member?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fullName || member?.username || 'Group member'
}

function getOrderStatusLabel(status) {
  const labels = {
    NOT_STARTED: 'Not started',
    PENDING: 'Pending',
    OPEN: 'Open',
    LOCKED: 'Locked',
  }

  return labels[status] || status?.replaceAll('_', ' ') || 'Unknown'
}

function getOrderStatusStyles(status) {
  const styles = {
    NOT_STARTED:
      'border-border bg-surface-secondary text-text-muted',
    PENDING:
      'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    OPEN:
      'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300',
    LOCKED:
      'border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300',
  }

  return styles[status] || styles.NOT_STARTED
}

export default function PayoutOrder({
  orderData,
  isAdmin,
  isDraft,
  canFinalizeOrder,
  isFinalizing,
  onFinalize,
}) {
  const members = Array.isArray(orderData?.members)
    ? [...orderData.members].sort(
        (a, b) =>
          Number(a.position || 0) - Number(b.position || 0),
      )
    : []

  const orderStatus = orderData?.order_status || 'NOT_STARTED'

  const isLocked = orderStatus === 'LOCKED'
  const isOpen = orderStatus === 'OPEN'
  const drawComplete = orderData?.draw_complete === true

  const selectedCount = Number(orderData?.selected_count ?? 0)
  const totalMembers = Number(orderData?.total_members ?? 0)
  const remainingCount = Number(orderData?.remaining_count ?? 0)

  const progressPercentage =
    totalMembers > 0
      ? Math.min(100, Math.max(0, (selectedCount / totalMembers) * 100))
      : 0

  const myMembershipId = orderData?.my_draw_status?.membership_id

  const myMember = members.find(
    (member) =>
      String(member.membership_id) === String(myMembershipId),
  )

  const myPosition = myMember?.position

  return (
    <Card
      title="Payout order"
      description="Review the order in which members are scheduled to receive their cycle payouts."
    >
      <div className="space-y-6">
        {/* Order status */}
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-secondary/40 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Payout order status
            </p>

            <p className="mt-1 text-lg font-semibold text-text">
              {getOrderStatusLabel(orderStatus)}
            </p>

            <p className="mt-1 text-sm text-text-muted">
              {isLocked
                ? 'All payout positions have been finalized.'
                : isOpen
                  ? 'Members can still request eligible position swaps.'
                  : 'The payout order is not yet finalized.'}
            </p>
          </div>

          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getOrderStatusStyles(orderStatus)}`}
          >
            {isLocked
              ? 'Finalized'
              : isOpen
                ? 'Open for swaps'
                : getOrderStatusLabel(orderStatus)}
          </span>
        </section>

        {/* Current member's position */}
        {myMember && (
          <section className="rounded-xl border border-[#452044]/20 bg-[#452044]/5 p-4 dark:border-[#b78ab5]/30 dark:bg-[#452044]/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Your payout position
            </p>

            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold text-text">
                  #{myPosition ?? '—'}
                </p>

                <p className="mt-1 text-sm text-text-muted">
                  {getMemberName(myMember)}
                </p>
              </div>

              <p className="text-sm text-text-muted">
                Draw number: {myMember.selected_number ?? '—'}
              </p>
            </div>
          </section>
        )}

        {/* Draw progress */}
        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-text">
                Draw progress
              </h3>

              <p className="mt-1 text-sm text-text-muted">
                {selectedCount} of {totalMembers} members have completed
                their draw selections.
              </p>
            </div>

            <span className="text-sm font-semibold text-text">
              {Math.round(progressPercentage)}%
            </span>
          </div>

          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-label="Draw completion progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercentage)}
          >
            <div
              className="h-full rounded-full bg-[#452044] transition-all duration-300"
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-text-muted">
            <span>
              {remainingCount} member
              {remainingCount === 1 ? '' : 's'} remaining
            </span>

            <span>
              {drawComplete
                ? 'All draw selections completed'
                : 'Waiting for remaining selections'}
            </span>
          </div>
        </section>

        {/* Payout positions */}
        <section>
          <div className="mb-4">
            <h3 className="font-semibold text-text">
              Member payout positions
            </h3>

            <p className="mt-1 text-sm text-text-muted">
              Members are listed in the order they are scheduled to
              receive their payouts.
            </p>
          </div>

          {members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface-secondary/30 p-6 text-center">
              <p className="font-medium text-text">
                No payout positions available
              </p>

              <p className="mt-2 text-sm leading-6 text-text-muted">
                {drawComplete
                  ? 'The draw is complete, but no member positions were returned.'
                  : 'Member payout positions will appear as draw selections are completed.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-surface-secondary text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      Position
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Member
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Username
                    </th>

                    <th className="px-4 py-3 text-right font-semibold">
                      Draw number
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {members.map((member, index) => {
                    const isCurrentMember =
                      myMembershipId !== null &&
                      myMembershipId !== undefined &&
                      String(member.membership_id) ===
                        String(myMembershipId)

                    return (
                      <tr
                        key={member.membership_id ?? index}
                        className={
                          isCurrentMember
                            ? 'bg-[#452044]/5 dark:bg-[#452044]/20'
                            : 'bg-surface'
                        }
                      >
                        <td className="px-4 py-3 font-semibold text-text">
                          {member.position ?? index + 1}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-text">
                              {getMemberName(member)}
                            </span>

                            {isCurrentMember && (
                              <span className="rounded-full border border-[#452044]/30 px-2 py-0.5 text-[10px] font-semibold text-[#452044] dark:text-[#d6b4d4]">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-text-muted">
                          {member.username
                            ? `@${member.username}`
                            : '—'}
                        </td>

                        <td className="px-4 py-3 text-right font-medium text-text">
                          {member.selected_number ?? '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Administrator finalization */}
        {isAdmin && isDraft && (
          <section className="space-y-4 border-t border-border pt-5">
            <div>
              <h3 className="font-semibold text-text">
                Finalize payout order
              </h3>

              <p className="mt-1 text-sm leading-6 text-text-muted">
                Finalizing locks the payout positions. Review the draw
                selections and make sure eligible swap requests have
                been resolved before continuing.
              </p>
            </div>

            {!drawComplete && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-6 text-amber-700 dark:text-amber-300">
                The draw must be completed before the payout order can
                be finalized.
              </p>
            )}

            {drawComplete && orderStatus !== 'OPEN' && (
              <p className="rounded-lg border border-border bg-surface-secondary p-3 text-sm leading-6 text-text-muted">
                The payout order must be open before it can be finalized.
              </p>
            )}

            {canFinalizeOrder && (
              <p className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-sm leading-6 text-green-700 dark:text-green-300">
                The payout order is ready for finalization.
              </p>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={onFinalize}
                disabled={!canFinalizeOrder || isFinalizing}
              >
                {isFinalizing
                  ? 'Finalizing order...'
                  : 'Finalize payout order'}
              </Button>
            </div>
          </section>
        )}

        {/* Locked state */}
        {isLocked && (
          <section className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
            <p className="font-semibold text-green-700 dark:text-green-300">
              Payout order finalized
            </p>

            <p className="mt-1 text-sm leading-6 text-text-muted">
              The payout positions are locked. Members can no longer
              exchange positions, and the order will be used for the
              cycle's payout schedule.
            </p>
          </section>
        )}
      </div>
    </Card>
  )
}
