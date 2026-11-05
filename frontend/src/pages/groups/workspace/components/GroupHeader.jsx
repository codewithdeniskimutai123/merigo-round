
import { getStatusStyles } from '../utils/groupWorkspaceUtils.js'

function GroupHeader({
  group,
  isAdmin,
  isMember,
  isPending,
  isRejected,
  membershipStatus,
  membershipRole,
}) {
  return (
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
  )
}

export default GroupHeader
