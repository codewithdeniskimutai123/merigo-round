import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '../api/authApi'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '')

function getPhotoUrl(photo) {
  if (!photo || typeof photo !== 'string') {
    return ''
  }

  if (/^https?:\/\//i.test(photo)) {
    return photo
  }

  return `${API_BASE_URL}/${photo.replace(/^\/+/, '')}`
}

function formatDate(value) {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 text-lg font-semibold text-text">{title}</h2>
      {children}
    </section>
  )
}

function Detail({ label, value }) {
  const displayValue =
    value !== null && value !== undefined && value !== ''
      ? value
      : 'Not provided'

  return (
    <div className="min-w-0">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 break-words font-medium text-text">
        {displayValue}
      </p>
    </div>
  )
}

function AccountLink({ to, title, description }) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-border p-4 transition-colors hover:bg-page"
    >
      <p className="font-semibold text-text">{title}</p>
      <p className="mt-1 text-sm leading-5 text-text-muted">
        {description}
      </p>
    </Link>
  )
}

export default function ProfilePage() {
  const [photoLoadError, setPhotoLoadError] = useState(false)

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await getCurrentUser()
      return response?.data ?? response
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })

  const photoUrl = getPhotoUrl(profile?.profile_photo)

  useEffect(() => {
    setPhotoLoadError(false)
  }, [photoUrl])

  const firstName = profile?.first_name || ''
  const lastName = profile?.last_name || ''
  const username = profile?.username || ''

  const fullName =
    `${firstName} ${lastName}`.trim() ||
    username ||
    'Your profile'

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() ||
    username.charAt(0).toUpperCase() ||
    'U'

  const accountStatus =
    typeof profile?.is_active === 'boolean'
      ? profile.is_active
        ? 'Active'
        : 'Inactive'
      : 'Not available'

  if (isLoading) {
    return (
      <main className="min-h-screen bg-page text-text transition-colors">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <header>
            <p className="text-sm font-semibold text-brand-600">
              MERIGO ROUND
            </p>
            <h1 className="mt-2 text-3xl font-bold">My Profile</h1>
          </header>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <p className="text-sm text-text-muted">
              Loading your profile details...
            </p>
          </section>
        </div>
      </main>
    )
  }

  if (isError || !profile || typeof profile !== 'object') {
    return (
      <main className="min-h-screen bg-page text-text transition-colors">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <header>
            <p className="text-sm font-semibold text-brand-600">
              MERIGO ROUND
            </p>
            <h1 className="mt-2 text-3xl font-bold">My Profile</h1>
          </header>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold">
              Unable to load your profile
            </h2>

            <p className="mt-2 text-sm leading-6 text-text-muted">
              We could not retrieve your account details. Check that you
              are signed in and that the backend server is running.
            </p>

            {error?.response?.status === 401 && (
              <p className="mt-2 text-sm text-red-600">
                Your session may have expired. Please sign in again.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFetching ? 'Retrying...' : 'Try again'}
              </button>

              <Link
                to="/login"
                className="rounded-lg border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-page"
              >
                Go to login
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-page text-text transition-colors">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Page heading */}
        <header>
          <p className="text-sm font-semibold text-brand-600">
            MERIGO ROUND
          </p>

          <h1 className="mt-2 text-3xl font-bold">My Profile</h1>

          <p className="mt-2 text-sm text-text-muted">
            View your personal information, group memberships and account
            details.
          </p>
        </header>

        {/* Profile summary */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              {photoUrl && !photoLoadError ? (
                <img
                  src={photoUrl}
                  alt={`${fullName}'s profile`}
                  className="h-20 w-20 shrink-0 rounded-full border border-border object-cover"
                  onError={() => setPhotoLoadError(true)}
                />
              ) : (
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white"
                  aria-label="Profile photo unavailable"
                >
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <h2 className="break-words text-xl font-bold">
                  {fullName}
                </h2>

                <p className="mt-1 break-words text-sm text-text-muted">
                  @{username || 'username unavailable'}
                </p>

                <p className="mt-2 text-sm font-medium text-brand-600">
                  {accountStatus === 'Not available'
                    ? 'Account status unavailable'
                    : `${accountStatus} account`}
                </p>
              </div>
            </div>

            <Link
              to="/edit-profile"
              className="inline-flex justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Edit profile
            </Link>
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Profile information */}
          <div className="space-y-6">
            <Panel title="Profile details">
              <div className="grid gap-6 sm:grid-cols-2">
                <Detail label="Account ID" value={profile.id} />
                <Detail label="First name" value={profile.first_name} />
                <Detail label="Last name" value={profile.last_name} />
                <Detail label="Username" value={profile.username} />
                <Detail label="Email address" value={profile.email} />
                <Detail label="Phone number" value={profile.phone_number} />
                <Detail label="Account status" value={accountStatus} />
                <Detail
                  label="Account created"
                  value={formatDate(profile.created_at)}
                />
                <Detail
                  label="Last updated"
                  value={formatDate(profile.updated_at)}
                />
              </div>
            </Panel>

            {/* Group information */}
            <Panel title="My group memberships">
              <p className="mb-5 text-sm text-text-muted">
                Your group membership information will be connected to the
                backend group APIs in a later development step.
              </p>

              <div className="rounded-xl border border-border p-4">
                <p className="font-semibold text-text">
                  Your groups and contribution activity
                </p>

                <p className="mt-1 text-sm leading-6 text-text-muted">
                  Your groups, membership roles, contribution history,
                  payment status, payout information and cycle details
                  will appear here when the group APIs are connected.
                </p>

                <Link
                  to="/groups"
                  className="mt-3 inline-block text-sm font-semibold text-brand-600 hover:underline"
                >
                  View groups
                </Link>
              </div>
            </Panel>
          </div>

          {/* Account navigation */}
          <aside className="space-y-6">
            <Panel title="Manage your account">
              <div className="space-y-3">
                <AccountLink
                  to="/settings"
                  title="Account settings"
                  description="Manage notifications, security, privacy and account access."
                />
              </div>
            </Panel>

            <Panel title="Account security">
              <p className="font-medium">
                Keep your account protected
              </p>

              <p className="mt-2 text-sm leading-6 text-text-muted">
                Use a strong password and never share your login details
                with other group members. Review your security options
                from Account Settings.
              </p>

              <Link
                to="/settings"
                className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline"
              >
                Manage security settings
              </Link>
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  )
}