
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword.length < 8) {
      setError('Your new password must contain at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Your new passwords do not match.')
      return
    }

    if (currentPassword === newPassword) {
      setError('Your new password must be different from your current password.')
      return
    }

    setSuccess(true)
  }

  return (
      <div className="mx-auto w-full max-w-md">
        <Card
          title="Update your password"
          description="Enter your current password and choose a strong new one."
        >
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success ? (
            <div className="space-y-5">
              <div
                role="status"
                className="rounded-lg border border-brand-600 bg-brand-50 p-4 text-sm text-brand-700"
              >
                Your form passed frontend validation. Your password has not
                actually changed yet because this page is not connected to Django.
              </div>

              <Link
                to="/login"
                className="block text-center text-sm font-semibold text-brand-600 hover:underline"
              >
                Return to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="currentPassword"
                label="Current password"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value)
                  setError('')
                }}
                autoComplete="current-password"
                required
              />

              <Input
                id="newPassword"
                label="New password"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value)
                  setError('')
                }}
                autoComplete="new-password"
                required
              />

              <Input
                id="confirmPassword"
                label="Confirm new password"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Enter your new password again"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value)
                  setError('')
                }}
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPasswords((previous) => !previous)}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                {showPasswords ? 'Hide passwords' : 'Show passwords'}
              </button>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button type="submit">
                  Change password
                </Button>

                <Link
                  to="/login"
                  className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}

          <div className="mt-6 border-t border-gray-200 pt-4 text-center text-sm dark:border-gray-700">
            Forgot your current password?{' '}
            <Link
              to="/forgot-password"
              className="font-semibold text-brand-600 hover:underline"
            >
              Reset it instead
            </Link>
          </div>
        </Card>
      </div>
  )
}
