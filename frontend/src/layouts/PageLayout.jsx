
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ThemeToggle from '../components/ThemeToggle.jsx'

export default function PageLayout({
  children,
  title,
  description,
  actions,
}) {
  const navigate = useNavigate()

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem('access')),
  )

  useEffect(() => {
    function updateAuthStatus() {
      setIsLoggedIn(Boolean(localStorage.getItem('access')))
    }

    window.addEventListener('storage', updateAuthStatus)
    window.addEventListener('auth-change', updateAuthStatus)

    return () => {
      window.removeEventListener('storage', updateAuthStatus)
      window.removeEventListener('auth-change', updateAuthStatus)
    }
  }, [])

  function handleLogout() {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    localStorage.removeItem('user')

    window.dispatchEvent(new Event('auth-change'))
    navigate('/login', { replace: true })
  }

  // Shared styling for navigation links.
  function getNavLinkClass({ isActive }) {
    return [
      'relative rounded-lg px-3 py-2 transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-[#C5A15B] focus-visible:ring-offset-2',
      isActive
        ? 'bg-[#452044] font-semibold text-white shadow-sm ring-1 ring-[#C5A15B]/40'
        : 'text-text-muted hover:bg-page hover:text-text',
    ].join(' ')
  }

  // Styling for links in the footer.
  function getFooterLinkClass({ isActive }) {
    return [
      'transition-colors duration-200',
      isActive
        ? 'font-semibold text-[#C5A15B]'
        : 'text-text-muted hover:text-text',
    ].join(' ')
  }

  return (
    <div className="min-h-screen bg-page text-text transition-colors">
      {/* Header and navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-text sm:text-2xl"
          >
            Merigo <span className="text-[#C5A15B]">Round</span>
          </Link>

          <nav
            aria-label="Main navigation"
            className="flex flex-wrap items-center gap-2 text-sm font-medium sm:gap-3"
          >
            <NavLink
              to="/"
              end
              className={getNavLinkClass}
            >
              Home
            </NavLink>

            {isLoggedIn ? (
              <>
                <NavLink
                  to="/dashboard"
                  className={getNavLinkClass}
                >
                  Dashboard
                </NavLink>

                <NavLink
                  to="/profile"
                  className={getNavLinkClass}
                >
                  Profile
                </NavLink>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-border px-4 py-2 text-text transition-colors duration-200 hover:border-[#C5A15B]/60 hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15B]"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={getNavLinkClass}
                >
                  Log in
                </NavLink>

                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    [
                      'rounded-lg px-4 py-2 font-semibold transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A15B]',
                      isActive
                        ? 'bg-[#C5A15B] text-[#32172F] shadow-sm'
                        : 'bg-[#452044] text-white hover:bg-[#32172F]',
                    ].join(' ')
                  }
                >
                  Create account
                </NavLink>
              </>
            )}
          </nav>

          <ThemeToggle />
        </div>
      </header>

      {/* Main page content */}
      <main className="min-h-[60vh]">
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          {(title || description || actions) && (
            <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                {title && (
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {title}
                  </h1>
                )}

                {description && (
                  <p className="text-text-muted">{description}</p>
                )}
              </div>

              {actions && (
                <div className="flex flex-wrap gap-3">
                  {actions}
                </div>
              )}
            </section>
          )}

          {children ?? <Outlet />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          <div className="space-y-3">
            <Link
              to="/"
              className="text-xl font-bold text-text"
            >
              Merigo <span className="text-[#C5A15B]">Round</span>
            </Link>

            <p className="max-w-sm text-sm leading-6 text-text-muted">
              A simpler way for communities to organize savings
              groups, track contributions, and manage payout cycles
              transparently.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-text">
              Quick links
            </h2>

            <div className="flex flex-col items-start gap-2 text-sm">
              <NavLink
                to="/"
                end
                className={getFooterLinkClass}
              >
                Home
              </NavLink>

              <NavLink
                to="/dashboard"
                className={getFooterLinkClass}
              >
                Dashboard
              </NavLink>

              <NavLink
                to="/profile"
                className={getFooterLinkClass}
              >
                My profile
              </NavLink>

              <NavLink
                to="/settings"
                className={getFooterLinkClass}
              >
                Settings
              </NavLink>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-text">
              Developer information
            </h2>

            <p className="text-sm text-text-muted">
              Developed by{' '}
              <span className="font-semibold text-text">
                Apexcore
              </span>
            </p>

            <p className="text-sm text-text-muted">
              Denis Kimutai
            </p>

            <a
              href="mailto:deniskimutai203@gmail.com"
              className="block break-all text-sm text-text-muted transition-colors hover:text-text"
            >
              deniskimutai203@gmail.com
            </a>

            <a
              href="tel:+254706017340"
              className="block text-sm text-text-muted transition-colors hover:text-text"
            >
              +254 706 017 340
            </a>
          </div>
        </div>

        <div className="border-t border-border px-4 py-4 text-center text-sm text-text-muted">
          © {new Date().getFullYear()} Apexcore. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
