
export function formatAmount(amount) {
  return Number(amount || 0).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(date) {
  if (!date) return 'Not specified'

  const parsedDate = new Date(`${date}T00:00:00`)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return parsedDate.toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateTime(date) {
  if (!date) return 'Not specified'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return parsedDate.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatHistoryDate(date) {
  if (!date) return 'Date unavailable'

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable'
  }

  return parsedDate.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function getStatusStyles(status) {
  const styles = {
    ACTIVE: 'bg-emerald-100 text-emerald-800',
    DRAFT: 'bg-slate-100 text-slate-700',
    PAUSED: 'bg-amber-100 text-amber-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
    PENDING: 'bg-amber-100 text-amber-800',
    OPEN: 'bg-blue-100 text-blue-800',
    LOCKED: 'bg-emerald-100 text-emerald-800',
    ACCEPTED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-slate-100 text-slate-700',
    UPCOMING: 'bg-slate-100 text-slate-700',
    WAITING_FOR_PAYMENT: 'bg-amber-100 text-amber-800',
    READY_FOR_PAYOUT: 'bg-blue-100 text-blue-800',
  }

  return styles[status] || 'bg-surface-secondary text-text'
}

export function formatRole(role) {
  if (!role) return 'Member'

  return role.charAt(0) + role.slice(1).toLowerCase()
}

export function getMemberName(member) {
  return (
    [member.first_name, member.last_name]
      .filter(Boolean)
      .join(' ') || member.username
  )
}
