
import { Link, useNavigate } from 'react-router-dom'

const profile = {
  id: 'MR-001',
  first_name: 'Denis',
  last_name: 'Kimutai',
  username: 'deniskimutai',
  email: 'denis@example.com',
  phone_number: '+254 712 345 678',
  profile_photo: '',
  is_active: true,
  created_at: 'Available after backend connection',
  updated_at: 'Available after backend connection',
}

const groups = [
  { id: 1, name: 'Savings Circle', members: 12 },
  { id: 2, name: 'Merry Friends', members: 8 },
  { id: 3, name: 'Development Group', members: 15 },
]

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <h2 className="mb-5 text-lg font-semibold text-text">{title}</h2>
      {children}
    </section>
  )
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 break-words font-medium text-text">
        {value || 'Not provided'}
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
  const navigate = useNavigate()

  const fullName =
    `${profile.first_name} ${profile.last_name}`.trim() || profile.username

  function handleLogout() {
    const confirmed = window.confirm(
      'Are you sure you want to log out?'
    )

    if (confirmed) {
      // Real authentication-token cleanup will be added during integration.
      navigate('/login')
    }
  }

  return (
  
      <main className="min-h-screen bg-page text-text transition-colors">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-600">
                MERIGO ROUND
              </p>
              <h1 className="mt-2 text-3xl font-bold">My Profile</h1>
              <p className="mt-2 text-sm text-text-muted">
                Manage your personal details, preferences, groups and security.
              </p>
            </div>

          </header>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                {profile.profile_photo ? (
                  <img
                    src={profile.profile_photo}
                    alt="Profile"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
                    {profile.first_name.charAt(0)}
                    {profile.last_name.charAt(0)}
                  </div>
                )}

                <div>
                  <h2 className="text-xl font-bold">{fullName}</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    @{profile.username}
                  </p>
                  <p className="mt-2 text-sm font-medium text-brand-600">
                    {profile.is_active ? 'Active account' : 'Inactive account'}
                  </p>
                </div>
              </div>

              <Link
                to="/edit-profile"
                className="inline-flex justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Edit profile
              </Link>
            </div>
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-6">
              <Panel title="Profile details">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Detail label="Account ID" value={profile.id} />
                  <Detail label="First name" value={profile.first_name} />
                  <Detail label="Last name" value={profile.last_name} />
                  <Detail label="Username" value={profile.username} />
                  <Detail label="Email address" value={profile.email} />
                  <Detail label="Phone number" value={profile.phone_number} />
                  <Detail
                    label="Account status"
                    value={profile.is_active ? 'Active' : 'Inactive'}
                  />
                  <Detail label="Account created" value={profile.created_at} />
                  <Detail label="Last updated" value={profile.updated_at} />
                </div>
              </Panel>

              <Panel title="My group memberships">
                <p className="mb-5 text-sm text-text-muted">
                  View the groups you belong to.
                </p>

                <div className="space-y-3">
                  {groups.map((group) => (
                    <Link
                      key={group.id}
                      to="/groups"
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-page"
                    >
                      <div>
                        <p className="font-semibold text-text">
                          {group.name}
                        </p>
                        <p className="mt-1 text-sm text-text-muted">
                          {group.members} members
                        </p>
                      </div>

                      <span className="text-sm font-medium text-brand-600">
                        View groups
                      </span>
                    </Link>
                  ))}
                </div>

                <p className="mt-4 text-xs text-text-muted">
                  These are sample groups. Actual memberships will come from
                  Django.
                </p>
              </Panel>
            </div>

            <aside className="space-y-6">
              <Panel title="Account settings">
                <div className="space-y-3">
                  <AccountLink
                    to="/settings"
                    title="Account settings"
                    description="Manage appearance, notifications and account access."
                  />

                  <AccountLink
                    to="/edit-profile"
                    title="Edit profile"
                    description="Update your personal information and profile photo."
                  />

                  <AccountLink
                    to="/change-password"
                    title="Change password"
                    description="Change your current password securely."
                  />

                  <AccountLink
                    to="/forgot-password"
                    title="Forgot password"
                    description="Start the password recovery process if you cannot sign in."
                  />
                </div>
              </Panel>

              <Panel title="Sign-in options">
                <div className="space-y-3">
                  <AccountLink
                    to="/login"
                    title="Login page"
                    description="Return to the sign-in page."
                  />

                  <AccountLink
                    to="/register"
                    title="Create an account"
                    description="Open the registration page."
                  />
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-4 w-full rounded-lg border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-page"
                >
                  Log out
                </button>
              </Panel>

              <Panel title="Account security">
                <p className="font-medium">
                  Keep your account protected
                </p>

                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Use a strong password and never share your login details
                  with other group members.
                </p>

                <Link
                  to="/change-password"
                  className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline"
                >
                  Manage password
                </Link>
              </Panel>

              <section className="rounded-2xl border border-red-300 bg-surface p-5 shadow-sm sm:p-6">
                <h2 className="text-lg font-semibold text-red-600">
                  Delete account
                </h2>

                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Account deletion may permanently remove your account and
                  associated information. This action remains unavailable
                  until the backend deletion process is implemented.
                </p>

                <button
                  type="button"
                  disabled
                  className="mt-5 w-full cursor-not-allowed rounded-lg border border-red-300 px-4 py-3 text-sm font-semibold text-red-500 opacity-70"
                >
                  Delete account — unavailable
                </button>
              </section>
            </aside>
          </div>
        </div>
      </main>
  )
}
