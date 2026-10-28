
import { Link, Outlet, useNavigate } from 'react-router-dom'
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

  return (
    <div className="min-h-screen bg-page text-text transition-colors">
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-text sm:text-2xl"
          >
            Merigo <span className="text-[#C5A15B]">Round</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-4 text-sm font-medium sm:gap-6">
            <Link
              to="/"
              className="text-text-muted transition hover:text-text"
            >
              Home
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-text-muted transition hover:text-text"
                >
                  Dashboard
                </Link>

                <Link
                  to="/profile"
                  className="text-text-muted transition hover:text-text"
                >
                  Profile
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-border px-4 py-2 text-text transition hover:bg-page"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-text-muted transition hover:text-text"
                >
                  Log in
                </Link>

                <Link
                  to="/register"
                  className="rounded-lg bg-[#452044] px-4 py-2 font-semibold text-white transition hover:bg-[#32172F]"
                >
                  Create account
                </Link>
              </>
            )}
          </nav>

          <ThemeToggle />
        </div>
      </header>

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
                <div className="flex flex-wrap gap-3">{actions}</div>
              )}
            </section>
          )}

          {children ?? <Outlet />}
        </div>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
          <div className="space-y-3">
            <Link to="/" className="text-xl font-bold text-text">
              Merigo <span className="text-[#C5A15B]">Round</span>
            </Link>

            <p className="max-w-sm text-sm leading-6 text-text-muted">
              A simpler way for communities to organize savings groups,
              track contributions, and manage payout cycles transparently.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-text">Quick links</h2>

            <div className="flex flex-col items-start gap-2 text-sm text-text-muted">
              <Link to="/" className="hover:text-text">Home</Link>
              <Link to="/dashboard" className="hover:text-text">Dashboard</Link>
              <Link to="/profile" className="hover:text-text">My profile</Link>
              <Link to="/settings" className="hover:text-text">Settings</Link>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-semibold text-text">Developer information</h2>

            <p className="text-sm text-text-muted">
              Developed by <span className="font-semibold text-text">Apexcore</span>
            </p>

            <p className="text-sm text-text-muted">
              Denis Kimutai
            </p>

            <a
              href="mailto:deniskimutai203@gmail.com"
              className="block break-all text-sm text-text-muted hover:text-text"
            >
              deniskimutai203@gmail.com
            </a>

            <a
              href="tel:+254706017340"
              className="block text-sm text-text-muted hover:text-text"
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
