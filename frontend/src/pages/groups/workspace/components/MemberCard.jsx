
import {
  formatRole,
  getMemberName,
} from '../utils/groupWorkspaceUtils.js'

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

export default MemberCard
