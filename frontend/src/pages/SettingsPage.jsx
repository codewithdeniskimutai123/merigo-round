
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const navigate = useNavigate()

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [saveMessage, setSaveMessage] = useState('')

  function handleSavePreferences(event) {
    event.preventDefault()

    // Temporary frontend behavior.
    // We will persist these preferences when we connect the backend.
    setSaveMessage('Preferences saved for this session.')
  }

  function handleLogout() {
    const confirmed = window.confirm(
      'Are you sure you want to log out?'
    )

    if (confirmed) {
      // Real token removal and session cleanup will be added later.
      navigate('/login')
    }
  }

  function handleDeleteAccount() {
    window.alert(
      'Account deletion will be implemented after we connect the backend.'
    )
  }

  return (

      <main className="min-h-screen bg-page px-4 py-8 text-text sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <Link
              to="/profile"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Back to profile
            </Link>

            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Account settings
            </h1>

            <p className="mt-2 text-sm text-text-muted">
              Manage your preferences, security and account access.
            </p>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Appearance
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  Choose how Merigo Round looks on your device.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Display theme</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Use your existing theme control to switch appearance.
                  </p>
                </div>

                <ThemeToggle />
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Notifications
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  Choose which updates you would like to receive.
                </p>
              </div>

              <form onSubmit={handleSavePreferences}>
                <div className="space-y-5">
                  <label className="flex cursor-pointer items-start justify-between gap-4">
                    <span>
                      <span className="block font-medium">
                        Email notifications
                      </span>
                      <span className="mt-1 block text-sm text-text-muted">
                        Receive account and group updates by email.
                      </span>
                    </span>

                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(event) => {
                        setEmailNotifications(event.target.checked)
                        setSaveMessage('')
                      }}
                      className="mt-1 h-4 w-4 accent-brand-600"
                    />
                  </label>

                  <div className="border-t border-border" />

                  <label className="flex cursor-pointer items-start justify-between gap-4">
                    <span>
                      <span className="block font-medium">
                        Security alerts
                      </span>
                      <span className="mt-1 block text-sm text-text-muted">
                        Receive alerts about important account security events.
                      </span>
                    </span>

                    <input
                      type="checkbox"
                      checked={securityAlerts}
                      onChange={(event) => {
                        setSecurityAlerts(event.target.checked)
                        setSaveMessage('')
                      }}
                      className="mt-1 h-4 w-4 accent-brand-600"
                    />
                  </label>
                </div>

                {saveMessage && (
                  <p
                    role="status"
                    className="mt-4 text-sm text-brand-600"
                  >
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
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">
                  Security
                </h2>

                <p className="mt-1 text-sm text-text-muted">
                  Keep your account information up to date.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Password</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Change your current account password.
                  </p>
                </div>

                <Link
                  to="/change-password"
                  className="inline-flex justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-page"
                >
                  Change password
                </Link>
              </div>

              <div className="my-5 border-t border-border" />

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">Profile information</p>
                  <p className="mt-1 text-sm text-text-muted">
                    Review or update your personal details.
                  </p>
                </div>

                <Link
                  to="/edit-profile"
                  className="inline-flex justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-page"
                >
                  Edit profile
                </Link>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h2 className="text-lg font-semibold">
                Account access
              </h2>

              <p className="mt-1 text-sm text-text-muted">
                Log out of your current session on this device.
              </p>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-5 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-page"
              >
                Log out
              </button>
            </section>

            <section className="rounded-2xl border border-red-300 bg-surface p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-red-600">
                Delete account
              </h2>

              <p className="mt-2 text-sm text-text-muted">
                Account deletion is a serious action. Before enabling it,
                we will implement backend authorization, confirmation and
                the required data-handling rules.
              </p>

              <button
                type="button"
                onClick={handleDeleteAccount}
                className="mt-5 rounded-lg border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950"
              >
                Delete account
              </button>
            </section>
          </div>
        </div>
      </main>
  
  )
}
