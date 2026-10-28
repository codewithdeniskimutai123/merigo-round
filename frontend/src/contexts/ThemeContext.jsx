
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('merigo-theme') || 'system'
  })

  useEffect(() => {
    const root = document.documentElement
    const systemPreference = window.matchMedia('(prefers-color-scheme: dark)')

    const applyTheme = () => {
      const isDark =
        theme === 'dark' ||
        (theme === 'system' && systemPreference.matches)

      root.classList.toggle('dark', isDark)
    }

    applyTheme()

    if (theme === 'system') {
      systemPreference.addEventListener('change', applyTheme)

      return () => {
        systemPreference.removeEventListener('change', applyTheme)
      }
    }
  }, [theme])

  useEffect(() => {
    localStorage.setItem('merigo-theme', theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
