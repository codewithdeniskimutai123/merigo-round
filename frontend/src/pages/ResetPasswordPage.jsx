
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess(false)

    if (password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setSuccess(true)
  }

  return (

      <div className="mx-auto w-full max-w-md">
        <Card
          title="Reset password"
          description="Enter your new password below."
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
            <div className="space-y-4">
              <div
                role="status"
                className="rounded-lg border border-brand-600 bg-brand-50 p-4 text-sm text-brand-700"
              >
                Your passwords passed frontend validation. The password
                will be changed when we connect Django.
              </div>

              <Link
                to="/login"
                className="block text-center text-sm font-medium text-brand-600 hover:underline"
              >
                Return to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Input
                  id="password"
                  label="New password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError('')
                  }}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>
              </div>

              <div className="space-y-2">
                <Input
                  id="confirmPassword"
                  label="Confirm new password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Enter your new password again"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setError('')
                  }}
                  required
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((previous) => !previous)
                  }
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  {showConfirmPassword ? 'Hide password' : 'Show password'}
                </button>
              </div>

              <Button type="submit">
                Reset password
              </Button>
            </form>
          )}
        </Card>
      </div>
  )
}
