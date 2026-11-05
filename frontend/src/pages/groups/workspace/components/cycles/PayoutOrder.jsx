
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
  const drawComplete = orderData?.draw_complete === true

  const selectedCount = orderData?.selected_count ?? 0
  const totalMembers = orderData?.total_members ?? 0
  const remainingCount = orderData?.remaining_count ?? 0

  return (
    <Card
      title="Payout order"
      description="Review the order in which members are scheduled to receive their cycle payouts."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-text-muted">
              Order status
            </p>

            <p className="mt-1 font-semibold text-text">
              {orderStatus.replaceAll('_', ' ')}
            </p>
          </div>

          {isLocked && (
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800">
              Finalized
            </span>
          )}
        </div>

        {!drawComplete && (
          <div className="rounded-lg border border-border bg-surface-secondary p-4">
            <p className="font-semibold text-text">
              Draw progress
            </p>

            <p className="mt-1 text-sm text-text-muted">
              {selectedCount} of {totalMembers} members have completed
              their draw selections.
            </p>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-[#452044] transition-all"
                style={{
                  width: `${
                    totalMembers > 0
                      ? Math.min(
                          100,
                          (selectedCount / totalMembers) * 100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-text-muted">
              {remainingCount} member
              {remainingCount === 1 ? '' : 's'} remaining.
            </p>
          </div>
        )}

        {members.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface-secondary p-5 text-center">
            <p className="text-sm text-text-muted">
              {drawComplete
                ? 'The payout order has no member positions to display.'
                : 'Member payout positions will appear after all members complete their draw selections.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-surface-secondary text-text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    Payout position
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
                {members.map((member, index) => (
                  <tr
                    key={member.membership_id}
                    className="bg-surface"
                  >
                    <td className="px-4 py-3 font-semibold text-text">
                      {member.position ?? index + 1}
                    </td>

                    <td className="px-4 py-3 text-text">
                      {getMemberName(member)}
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
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin && isDraft && (
          <div className="space-y-3 border-t border-border pt-5">
            <p className="text-sm leading-6 text-text-muted">
              Finalizing the order locks the members' payout positions.
              Make sure all draw selections and eligible swap requests
              have been resolved before continuing.
            </p>

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
          </div>
        )}

        {isLocked && (
          <p className="text-sm text-text-muted">
            The payout order is locked and can no longer be changed.
          </p>
        )}
      </div>
    </Card>
  )
}
