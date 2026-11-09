
import { useEffect, useRef } from 'react'

const INACTIVITY_LIMIT = 30 * 60 * 1000
const LAST_ACTIVITY_KEY = 'lastActivity'

export default function useInactivityLogout(isLoggedIn, onLogout) {
  const logoutRef = useRef(onLogout)

  // Always keep the latest logout function available.
  useEffect(() => {
    logoutRef.current = onLogout
  }, [onLogout])

  useEffect(() => {
    // Do not track inactivity when the user is logged out.
    if (!isLoggedIn) {
      return
    }

    let timeoutId = null
    let lastActivity = 0
    let lastSavedActivity = 0

    // Read the most recent activity timestamp.
    const getLastActivity = () => {
      const savedActivity = Number(
        localStorage.getItem(LAST_ACTIVITY_KEY)
      )

      return Math.max(lastActivity, savedActivity || 0)
    }

    // Save the activity timestamp in localStorage.
    const saveActivity = (timestamp) => {
      localStorage.setItem(
        LAST_ACTIVITY_KEY,
        String(timestamp)
      )

      lastSavedActivity = timestamp
    }

    // Check whether the user has been inactive for 30 minutes.
    const logoutIfInactive = () => {
      clearTimeout(timeoutId)

      const currentActivity = getLastActivity()
      lastActivity = currentActivity

      const elapsed = Date.now() - currentActivity
      const remainingTime = INACTIVITY_LIMIT - elapsed

      if (remainingTime <= 0) {
        logoutRef.current()
        return
      }

      timeoutId = window.setTimeout(
        logoutIfInactive,
        remainingTime
      )
    }

    // Record activity and restart the inactivity countdown.
    const recordActivity = () => {
      const now = Date.now()

      lastActivity = now

      // Save at most once per second to avoid excessive writes.
      if (now - lastSavedActivity >= 1000) {
        saveActivity(now)
      }

      clearTimeout(timeoutId)

      timeoutId = window.setTimeout(
        logoutIfInactive,
        INACTIVITY_LIMIT
      )
    }

    // Synchronise activity recorded in another browser tab.
    const handleStorageChange = (event) => {
      if (event.key !== LAST_ACTIVITY_KEY || !event.newValue) {
        return
      }

      const otherTabActivity = Number(event.newValue)

      if (
        Number.isFinite(otherTabActivity) &&
        otherTabActivity > lastActivity
      ) {
        lastActivity = otherTabActivity
        logoutIfInactive()
      }
    }

    // Check inactivity when the user returns to the page.
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logoutIfInactive()
      }
    }

    // Initialise activity from localStorage.
    const savedActivity = Number(
      localStorage.getItem(LAST_ACTIVITY_KEY)
    )

    const initialActivity = savedActivity || Date.now()

    lastActivity = initialActivity
    lastSavedActivity = savedActivity || 0

    if (!savedActivity) {
      saveActivity(initialActivity)
    }

    // Immediately log out if the saved activity is too old.
    if (Date.now() - initialActivity >= INACTIVITY_LIMIT) {
      logoutRef.current()
      return
    }

    // Start the countdown using the saved activity time.
    logoutIfInactive()

    // Events that indicate user activity.
    const activityEvents = [
      'pointerdown',
      'pointermove',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
    ]

    // Register activity listeners.
    activityEvents.forEach((event) => {
      window.addEventListener(event, recordActivity, {
        passive: true,
      })
    })

    // Register browser and multi-tab listeners.
    window.addEventListener('storage', handleStorageChange)

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    )

    window.addEventListener('pageshow', logoutIfInactive)

    // Clean up timers and listeners when the effect stops.
    return () => {
      clearTimeout(timeoutId)

      activityEvents.forEach((event) => {
        window.removeEventListener(event, recordActivity)
      })

      window.removeEventListener('storage', handleStorageChange)

      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      )

      window.removeEventListener('pageshow', logoutIfInactive)
    }
  }, [isLoggedIn])
}
