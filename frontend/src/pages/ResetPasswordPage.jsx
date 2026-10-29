import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { resetPassword } from '../api/authApi.js'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: '',
    general: '',
  })
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) return

    const validationErrors = {
      password: '',
      confirmPassword: '',
      general: '',
    }

    if (!token) {
      validationErrors.general =
        'This password reset link is missing its token. Please request a new reset link.'
    }

    if (!password) {
      validationErrors.password = 'New password is required.'
    } else if (password.length < 8) {
      validationErrors.password =
        'Your password must contain at least 8 characters.'
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword =
        'Please confirm your new password.'
    } else if (password !== confirmPassword) {
      validationErrors.confirmPassword = 'Your passwords do not match.'
    }

    setErrors(validationErrors)

    if (
      validationErrors.password ||
      validationErrors.confirmPassword ||
      validationErrors.general
    ) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await resetPassword({
        token,
        new_password: password,
        confirm_password: confirmPassword,
      })

      setSuccess(true)

      toast.success(
        response?.detail || 'Your password has been reset successfully.'
      )
    } catch (requestError) {
      const data = requestError.response?.data

      if (typeof data?.detail === 'string') {
        setErrors((previous) => ({
          ...previous,
          general: data.detail,
        }))
      } else if (data?.token) {
        setErrors((previous) => ({
          ...previous,
          general: Array.isArray(data.token)
            ? data.token[0]
            : data.token,
        }))
      } else if (data?.new_password) {
        setErrors((previous) => ({
          ...previous,
          password: Array.isArray(data.new_password)
            ? data.new_password[0]
            : data.new_password,
        }))
      } else if (data?.confirm_password) {
        setErrors((previous) => ({
          ...previous,
          confirmPassword: Array.isArray(data.confirm_password)
            ? data.confirm_password[0]
            : data.confirm_password,
        }))
      } else if (!requestError.response) {
        setErrors((previous) => ({
          ...previous,
          general:
            'Unable to connect to the server. Please check your connection and try again.',
        }))
      } else {
        setErrors((previous) => ({
          ...previous,
          general: 'Unable to reset your password. Please try again.',
        }))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handlePasswordChange(event) {
    const value = event.target.value
    setPassword(value)

    setErrors((previous) => ({
      ...previous,
      password: '',
      confirmPassword:
        value && confirmPassword && value !== confirmPassword
          ? 'Your passwords do not match.'
          : '',
      general: '',
    }))
  }

  function handleConfirmPasswordChange(event) {
    const value = event.target.value
    setConfirmPassword(value)

    setErrors((previous) => ({
      ...previous,
      confirmPassword:
        value && password !== value
          ? 'Your passwords do not match.'
          : '',
      general: '',
    }))
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card
        title="Reset password"
        description="Enter your new password below."
      >
        {errors.general && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          >
            {errors.general}
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-lg border border-brand-600 bg-brand-50 p-4 text-sm text-brand-700"
            >
              Your password has been reset successfully. You can now sign in
              using your new password.
            </div>

            <Link
              to="/login"
              className="block text-center text-sm font-medium text-brand-600 hover:underline"
            >
              Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="space-y-2">
              <div>
                <Input
                  id="password"
                  name="new_password"
                  label="New password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={handlePasswordChange}
                  invalid={Boolean(errors.password)}
                  required
                />

                {errors.password && (
                  <p role="alert" className="mt-1.5 text-sm text-red-600">
                    {errors.password}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
            </div>

            <div className="space-y-2">
              <div>
                <Input
                  id="confirmPassword"
                  name="confirm_password"
                  label="Confirm new password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Enter your new password again"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  invalid={Boolean(errors.confirmPassword)}
                  required
                />

                {errors.confirmPassword && (
                  <p role="alert" className="mt-1.5 text-sm text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

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

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Resetting password...' : 'Reset password'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}