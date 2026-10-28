
import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from '../layouts/PageLayout.jsx'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))

    setError('')
    setSuccess(false)
  }

  function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess(false)

    if (formData.password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Your passwords do not match.')
      return
    }

    setSuccess(true)
  }

  return (
      <div className="mx-auto w-full max-w-lg">
        <Card
          title="Create your account"
          description="Enter your details to get started."
        >
          {success && (
            <div
              role="status"
              className="mb-5 rounded-lg border border-brand-600 bg-brand-50 p-3 text-sm text-brand-700"
            >
              Your form is valid! Account creation will be enabled when
              we connect the frontend to Django.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              id="username"
              label="Username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              required
            />

            <Input
              id="email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />

            <Input
              id="phone_number"
              label="Phone number"
              type="tel"
              placeholder="e.g. 0712345678"
              value={formData.phone_number}
              onChange={handleChange}
              required
            />

            <div className="space-y-2">
              <Input
                id="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
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
                label="Confirm password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Enter your password again"
                value={formData.confirmPassword}
                onChange={handleChange}
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
              Create account
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-text-muted">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            variant="secondary"
            onClick={() =>
              alert('Google sign-up will be enabled during integration.')
            }
          >
            <span className="mr-2 font-bold">G</span>
            Continue with Google
          </Button>

          <p className="mt-5 text-center text-sm text-text-muted">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-brand-600 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
  )
}
