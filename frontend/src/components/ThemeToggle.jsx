
import { useTheme } from '../contexts/ThemeContext.jsx'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="theme-select" className="text-text text-sm">
        Appearance
      </label>

      <select
        id="theme-select"
        value={theme}
        onChange={(event) => setTheme(event.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-text"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  )
}
