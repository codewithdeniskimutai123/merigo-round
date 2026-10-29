import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { changePassword } from '../api/authApi.js'

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [errors, setErrors] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    general: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  function handleCancel() {
    if (location.key !== 'default' && window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/profile', { replace: true })
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) return

    const validationErrors = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      general: '',
    }

    if (!currentPassword) {
      validationErrors.currentPassword = 'Current password is required.'
    }

    if (!newPassword) {
      validationErrors.newPassword = 'New password is required.'
    } else if (newPassword.length < 8) {
      validationErrors.newPassword =
        'Your new password must contain at least 8 characters.'
    } else if (newPassword === currentPassword) {
      validationErrors.newPassword =
        'Your new password must be different from your current password.'
    }

    if (!confirmPassword) {
      validationErrors.confirmPassword =
        'Please confirm your new password.'
    } else if (newPassword !== confirmPassword) {
      validationErrors.confirmPassword = 'Your new passwords do not match.'
    }

    setErrors(validationErrors)

    if (
      validationErrors.currentPassword ||
      validationErrors.newPassword ||
      validationErrors.confirmPassword
    ) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })

      toast.success(
        response?.detail || 'Your password has been changed successfully.'
      )

      // The backend invalidates refresh tokens after changing the password.
      // Redirect directly to login instead of returning to the profile.
      navigate('/login', { replace: true })
    } catch (requestError) {
      const data = requestError.response?.data

      if (data?.current_password) {
        setErrors((previous) => ({
          ...previous,
          currentPassword: Array.isArray(data.current_password)
            ? data.current_password[0]
            : data.current_password,
        }))
      } else if (data?.new_password) {
        setErrors((previous) => ({
          ...previous,
          newPassword: Array.isArray(data.new_password)
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
      } else if (typeof data?.detail === 'string') {
        setErrors((previous) => ({
          ...previous,
          general: data.detail,
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
          general: 'Unable to change your password. Please try again.',
        }))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function clearFieldError(field, value) {
    if (field === 'currentPassword') setCurrentPassword(value)
    if (field === 'newPassword') setNewPassword(value)
    if (field === 'confirmPassword') setConfirmPassword(value)

    setErrors((previous) => ({
      ...previous,
      [field]: '',
      general: '',
    }))
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card
        title="Update your password"
        description="Enter your current password and choose a strong new one."
      >
        {errors.general && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          >
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <Input
              id="currentPassword"
              name="current_password"
              label="Current password"
              type={showPasswords ? 'text' : 'password'}
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(event) =>
                clearFieldError('currentPassword', event.target.value)
              }
              invalid={Boolean(errors.currentPassword)}
              autoComplete="current-password"
              required
            />

            {errors.currentPassword && (
              <p role="alert" className="mt-1.5 text-sm text-red-600">
                {errors.currentPassword}
              </p>
            )}
          </div>

          <div>
            <Input
              id="newPassword"
              name="new_password"
              label="New password"
              type={showPasswords ? 'text' : 'password'}
              placeholder="Enter your new password"
              value={newPassword}
              onChange={(event) =>
                clearFieldError('newPassword', event.target.value)
              }
              invalid={Boolean(errors.newPassword)}
              autoComplete="new-password"
              required
            />

            {errors.newPassword && (
              <p role="alert" className="mt-1.5 text-sm text-red-600">
                {errors.newPassword}
              </p>
            )}
          </div>

          <div>
            <Input
              id="confirmPassword"
              name="confirm_password"
              label="Confirm new password"
              type={showPasswords ? 'text' : 'password'}
              placeholder="Enter your new password again"
              value={confirmPassword}
              onChange={(event) =>
                clearFieldError('confirmPassword', event.target.value)
              }
              invalid={Boolean(errors.confirmPassword)}
              autoComplete="new-password"
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
            onClick={() => setShowPasswords((previous) => !previous)}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            {showPasswords ? 'Hide passwords' : 'Show passwords'}
          </button>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Changing password...' : 'Change password'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>

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