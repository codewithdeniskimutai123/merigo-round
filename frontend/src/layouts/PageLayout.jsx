
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import ThemeToggle from '../components/ThemeToggle.jsx'

export default function PageLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem('access'))
  )
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const updateAuthState = () => {
      setIsLoggedIn(Boolean(localStorage.getItem('access')))
    }

    window.addEventListener('storage', updateAuthState)
    window.addEventListener('auth-change', updateAuthState)

    return () => {
      window.removeEventListener('storage', updateAuthState)
      window.removeEventListener('auth-change', updateAuthState)
    }
  }, [])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    localStorage.removeItem('user')

    setIsLoggedIn(false)
    setIsMenuOpen(false)

    window.dispatchEvent(new Event('auth-change'))
    navigate('/login')
  }

  const navLinkClass = ({ isActive }) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-text hover:bg-surface hover:text-primary'
    }`

  const renderNavigation = () => (
    <>
      <NavLink to="/" end className={navLinkClass}>
        Home
      </NavLink>

      <NavLink to="/groups/create" className={navLinkClass}>
        Create a group
      </NavLink>

      {isLoggedIn ? (
        <>
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>

          <NavLink to="/profile" className={navLinkClass}>
            My profile
          </NavLink>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface hover:text-primary"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={navLinkClass}>
            Login
          </NavLink>

          <NavLink to="/register" className={navLinkClass}>
            Register
          </NavLink>
        </>
      )}
    </>
  )

  // Reusable styling for all contact links
  const contactLinkClass =
    'group flex w-fit items-center gap-2.5 rounded-md px-2 py-1.5 text-xs text-text/75 transition-all duration-300 ease-out hover:translate-x-1 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  const contactIconClass =
    'h-5 w-5 shrink-0 transition-all duration-300 ease-out group-hover:scale-125 group-hover:-translate-y-0.5'

  return (
    <div className="flex min-h-screen flex-col bg-page text-text transition-colors">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          <div className="flex h-16 items-center justify-between">

            {/* Brand */}
            <Link
              to="/"
              className="text-xl font-bold tracking-tight text-primary"
            >
              Merigo Round
            </Link>

            {/* Desktop navigation */}
            <nav className="hidden items-center gap-2 md:flex">
              {renderNavigation()}
            </nav>

            {/* Mobile controls */}
            <div className="flex items-center gap-3 md:hidden">
              <ThemeToggle />

              <button
                type="button"
                onClick={() => setIsMenuOpen((previous) => !previous)}
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-navigation"
                className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md border border-border transition-colors hover:bg-surface"
              >
                <span
                  className={`h-0.5 w-5 rounded-full bg-text transition-all duration-300 ${
                    isMenuOpen ? 'translate-y-2 rotate-45' : ''
                  }`}
                />

                <span
                  className={`h-0.5 w-5 rounded-full bg-text transition-all duration-300 ${
                    isMenuOpen ? 'opacity-0' : ''
                  }`}
                />

                <span
                  className={`h-0.5 w-5 rounded-full bg-text transition-all duration-300 ${
                    isMenuOpen ? '-translate-y-2 -rotate-45' : ''
                  }`}
                />
              </button>
            </div>

            {/* Desktop theme toggle */}
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile navigation */}
          <div
            id="mobile-navigation"
            aria-hidden={!isMenuOpen}
            className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-in-out md:hidden ${
              isMenuOpen
                ? 'mt-3 grid-rows-[1fr] opacity-100'
                : 'mt-0 grid-rows-[0fr] opacity-0'
            }`}
          >
            <nav className="mx-auto flex min-h-0 w-full max-w-xs flex-col items-center gap-2 overflow-hidden border-t border-border pt-3 text-center">
              {renderNavigation()}
            </nav>
          </div>

        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children ?? <Outlet />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-surface/30 backdrop-blur-md">

        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-start justify-start gap-x-8 gap-y-8 px-5 py-8 sm:px-8 lg:px-10">

          {/* Section 1: Merigo Round */}
          <div className="min-w-[220px] flex-[1_1_220px] space-y-2">
            <h3 className="text-sm font-bold text-primary">
              Merigo Round
            </h3>

            <p className="max-w-xs text-xs leading-relaxed text-text/75">
              A simpler way for communities to organize savings groups,
              track contributions, and manage payout cycles transparently.
            </p>
          </div>

          {/* Section 2: Quick Links */}
          <div className="min-w-[150px] flex-[1_1_150px] space-y-2">
            <h3 className="text-sm font-semibold text-text">
              Quick Links
            </h3>

            <div className="flex flex-col items-start gap-1">
              <Link to="/" className={contactLinkClass}>
                <span>Home</span>
              </Link>

              <Link to="/dashboard" className={contactLinkClass}>
                <span>Dashboard</span>
              </Link>

              <Link to="/profile" className={contactLinkClass}>
                <span>My Profile</span>
              </Link>

              <Link to="/settings" className={contactLinkClass}>
                <span>Settings</span>
              </Link>
            </div>
          </div>

          {/* Section 3: Contact Us */}
          <div className="min-w-[150px] flex-[1_1_150px] space-y-2">
            <h3 className="text-sm font-semibold text-text">
              Contact Us
            </h3>

            <div className="flex flex-col items-start gap-1">

              {/* WhatsApp */}
              <a
                href="https://wa.me/254706017340?text=Hello%20Merigo%20Round%20team%2C%20I%20visited%20your%20website%20and%20would%20like%20to%20know%20more%20about%20your%20platform.%20Please%20assist%20me."
                target="_blank"
                rel="noopener noreferrer"
                className={contactLinkClass}
              >
                <svg viewBox="0 0 24 24" className={contactIconClass} fill="#25D366" aria-hidden="true">
                  <path d="M12.04 2a9.92 9.92 0 0 0-8.5 15.03L2.1 22l5.1-1.34A9.96 9.96 0 1 0 12.04 2Zm0 18.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.03.8.81-2.96-.2-.31A8.13 8.13 0 1 1 12.04 20.1Zm4.46-6.08c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.18 1.1.15 1.52.09.46-.07 1.43-.59 1.63-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
                </svg>
                <span>WhatsApp</span>
              </a>

              {/* Gmail */}
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=deniskimutai203@gmail.com"
                target="_blank"
                rel="noopener noreferrer"
                className={contactLinkClass}
              >
                <svg viewBox="0 0 24 24" className={contactIconClass} aria-hidden="true">
                  <path fill="#4285F4" d="M22 6.5v12a2 2 0 0 1-2 2h-2V9.1l-6 4.4-6-4.4v11.4H4a2 2 0 0 1-2-2v-12l2-1.5 8 6 8-6 2 1.5Z" />
                  <path fill="#EA4335" d="M2 6.5A2.5 2.5 0 0 1 6 4.6l6 4.5 6-4.5a2.5 2.5 0 0 1 4 1.9l-2 1.5-8 6-8-6-2-1.5Z" />
                  <path fill="#34A853" d="M2 6.5v12a2 2 0 0 0 2 2h2V9.1L2 6.5Z" />
                  <path fill="#FBBC04" d="M18 9.1v11.4h2a2 2 0 0 0 2-2v-12l-4 2.6Z" />
                </svg>
                <span>Email Us</span>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/engdenis-kimutai/"
                target="_blank"
                rel="noopener noreferrer"
                className={contactLinkClass}
              >
                <svg viewBox="0 0 24 24" className={contactIconClass} fill="#0A66C2" aria-hidden="true">
                  <path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM8.01 18.5H5V9.6h3.01v8.9ZM6.5 8.39a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Zm12 10.11h-3v-4.33c0-1.03-.02-2.35-1.43-2.35-1.43 0-1.65 1.12-1.65 2.27v4.41h-3V9.6h2.88v1.22h.04c.4-.7 1.38-1.43 2.84-1.43 3.04 0 3.61 2 3.61 4.6v4.51Z" />
                </svg>
                <span>LinkedIn</span>
              </a>

              {/* Facebook */}
              <a
                href="https://www.facebook.com/profile.php?id=61557041304559"
                target="_blank"
                rel="noopener noreferrer"
                className={contactLinkClass}
              >
                <svg viewBox="0 0 24 24" className={contactIconClass} fill="#0866FF" aria-hidden="true">
                  <path d="M24 12a12 12 0 1 0-13.88 11.86v-8.39H7.08V12h3.04V9.35c0-3 1.79-4.66 4.52-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.51c-1.49 0-1.95.93-1.95 1.88V12h3.32l-.53 3.47h-2.79v8.39A12 12 0 0 0 24 12Z" />
                </svg>
                <span>Facebook</span>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/codewithkim7/"
                target="_blank"
                rel="noopener noreferrer"
                className={contactLinkClass}
              >
                <svg viewBox="0 0 24 24" className={contactIconClass} fill="none" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="#E4405F" strokeWidth="2" />
                  <circle cx="12" cy="12" r="4" stroke="#E4405F" strokeWidth="2" />
                  <circle cx="17.5" cy="6.5" r="1.2" fill="#E4405F" />
                </svg>
                <span>Instagram</span>
              </a>

            </div>
          </div>

          {/* Section 4: Developer Details */}
          <div className="min-w-[220px] flex-[1_1_220px] space-y-2">
            <h3 className="text-sm font-semibold text-text">
              Developer
            </h3>

            <div className="flex flex-col items-start gap-1 text-xs text-text/75">
              <p className="px-2 py-1.5">Developed by Apexcore</p>
              <p className="px-2 py-1.5">Denis Kimutai</p>

              <a
                href="mailto:deniskimutai203@gmail.com"
                className={contactLinkClass}
              >
                <span>deniskimutai203@gmail.com</span>
              </a>

              <a
                href="tel:+254706017340"
                className={contactLinkClass}
              >
                <span>+254 706 017 340</span>
              </a>
            </div>
          </div>

        </div>

        {/* Copyright */}
        <div className="border-t border-border/40 px-4 py-2 text-center">
          <p className="text-xs text-text/60">
            © {new Date().getFullYear()} Apexcore. All rights reserved.
          </p>
        </div>

      </footer>
    </div>
  )
}
