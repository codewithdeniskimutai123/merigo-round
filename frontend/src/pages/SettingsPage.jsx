import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function SettingsSection({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

function SettingRow({ title, description, children }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm leading-5 text-text-muted">
          {description}
        </p>
      </div>
      {children}
    </div>
  )
}

function ToggleSetting({ title, description, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-text-muted">
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-brand-600"
      />
    </label>
  )
}

function ComingSoon() {
  return (
    <span className="inline-flex w-fit rounded-full bg-page px-3 py-1 text-xs font-medium text-text-muted">
      Coming soon
    </span>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState({
    email: true,
    contributions: true,
    payments: true,
    groupAnnouncements: true,
    securityAlerts: true,
  })

  const [saveMessage, setSaveMessage] = useState('')

  function updateNotification(key, value) {
    setNotifications((previous) => ({
      ...previous,
      [key]: value,
    }))
    setSaveMessage('')
  }

  function handleSavePreferences(event) {
    event.preventDefault()
    setSaveMessage(
      'Preferences saved for this session. Backend saving is not yet connected.'
    )
  }

  function handleLogout() {
    const confirmed = window.confirm(
      'Are you sure you want to log out?'
    )

    if (!confirmed) return

    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    localStorage.removeItem('user')

    window.dispatchEvent(new Event('auth-change'))
    navigate('/login', { replace: true })
  }

  function handleExportData() {
    window.alert(
      'Account data export will be available after the backend feature is implemented.'
    )
  }

  function handleDeleteAccount() {
    const confirmed = window.confirm(
      'Account deletion is not available yet. No account information will be deleted. Would you like to continue to the profile page instead?'
    )

    if (confirmed) navigate('/profile')
  }

  return (
    <main className="min-h-screen bg-page px-4 py-8 text-text sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <Link
            to="/profile"
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Back to profile
          </Link>

          <p className="mt-5 text-sm font-semibold text-brand-600">
            MERIGO ROUND
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Account settings
          </h1>

          <p className="mt-2 text-sm text-text-muted">
            Manage your notifications, security, privacy and account access.
          </p>
        </header>

        <div className="space-y-6">
          {/* 1. Notifications */}
          <SettingsSection
            title="Notifications"
            description="Choose the updates you would like to receive."
          >
            <form onSubmit={handleSavePreferences}>
              <div className="space-y-5">
                <ToggleSetting
                  title="Email notifications"
                  description="Receive important account updates by email."
                  checked={notifications.email}
                  onChange={(value) => updateNotification('email', value)}
                />

                <div className="border-t border-border" />

                <ToggleSetting
                  title="Contribution reminders"
                  description="Get reminders when your group contribution is due."
                  checked={notifications.contributions}
                  onChange={(value) =>
                    updateNotification('contributions', value)
                  }
                />

                <div className="border-t border-border" />

                <ToggleSetting
                  title="Payment and payout notifications"
                  description="Receive updates about contribution payments and payouts."
                  checked={notifications.payments}
                  onChange={(value) => updateNotification('payments', value)}
                />

                <div className="border-t border-border" />

                <ToggleSetting
                  title="Group announcements"
                  description="Receive updates and important announcements from your groups."
                  checked={notifications.groupAnnouncements}
                  onChange={(value) =>
                    updateNotification('groupAnnouncements', value)
                  }
                />

                <div className="border-t border-border" />

                <ToggleSetting
                  title="Security alerts"
                  description="Receive alerts about important account security events."
                  checked={notifications.securityAlerts}
                  onChange={(value) =>
                    updateNotification('securityAlerts', value)
                  }
                />
              </div>

              {saveMessage && (
                <p role="status" className="mt-4 text-sm text-brand-600">
                  {saveMessage}
                </p>
              )}

              <button
                type="submit"
                className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Save preferences
              </button>
            </form>
          </SettingsSection>

          {/* 2. Security */}
          <SettingsSection
            title="Security"
            description="Manage how you sign in and protect your account."
          >
            <div className="space-y-5">
              <SettingRow
                title="Password"
                description="Change your current account password."
              >
                <Link
                  to="/change-password"
                  className="inline-flex shrink-0 justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-page"
                >
                  Change password
                </Link>
              </SettingRow>

              <div className="border-t border-border" />

              <SettingRow
                title="Connected accounts"
                description="Manage Google sign-in and other linked login methods."
              >
                <ComingSoon />
              </SettingRow>

              <div className="border-t border-border" />

              <SettingRow
                title="Two-factor authentication"
                description="Add an extra verification step when signing in."
              >
                <ComingSoon />
              </SettingRow>

              <div className="border-t border-border" />

              <SettingRow
                title="Active sessions and devices"
                description="Review devices signed in to your account and revoke access."
              >
                <ComingSoon />
              </SettingRow>
            </div>
          </SettingsSection>

          {/* 3. Privacy and data */}
          <SettingsSection
            title="Privacy & Data"
            description="Manage your personal data and account privacy."
          >
            <div className="space-y-5">
              <SettingRow
                title="Download your data"
                description="Request a copy of your profile and available account information."
              >
                <button
                  type="button"
                  onClick={handleExportData}
                  className="inline-flex shrink-0 justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-page"
                >
                  Request export
                </button>
              </SettingRow>

              <div className="border-t border-border" />

              <SettingRow
                title="Privacy controls"
                description="Manage how your personal information is used and shared."
              >
                <ComingSoon />
              </SettingRow>

              <div className="mt-5 rounded-xl border border-border bg-page p-4">
                <p className="text-sm font-semibold">Financial records</p>
                <p className="mt-1 text-sm leading-5 text-text-muted">
                  Merigo Round must preserve relevant contribution, payment
                  and payout records according to applicable requirements,
                  even when an account deletion request is made.
                </p>
              </div>
            </div>
          </SettingsSection>

          {/* 4. Account access */}
          <SettingsSection
            title="Account access"
            description="Control access to your Merigo Round account."
          >
            <SettingRow
              title="Log out"
              description="Sign out of your account on this device."
            >
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex shrink-0 justify-center rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-page"
              >
                Log out
              </button>
            </SettingRow>

            <div className="my-5 border-t border-border" />

            <SettingRow
              title="Log out of all devices"
              description="End sessions on all devices where your account is signed in."
            >
              <ComingSoon />
            </SettingRow>
          </SettingsSection>

          {/* Account deletion */}
          <section className="rounded-2xl border border-red-300 bg-surface p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-red-600">
              Delete account
            </h2>

            <p className="mt-2 text-sm leading-6 text-text-muted">
              Account deletion requires backend authorization, identity
              verification and appropriate handling of financial records.
              This feature is not available yet.
            </p>

            <button
              type="button"
              onClick={handleDeleteAccount}
              className="mt-5 rounded-lg border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950"
            >
              Account deletion information
            </button>
          </section>

          <p className="text-center text-xs text-text-muted">
            Some preferences are currently stored only in page state.
            Backend persistence will be connected later.
          </p>
        </div>
      </div>
    </main>
  )
}