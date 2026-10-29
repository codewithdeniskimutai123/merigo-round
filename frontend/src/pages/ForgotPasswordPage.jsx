import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { requestPasswordReset } from '../api/authApi.js'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailError, setEmailError] = useState('')

  const navigate = useNavigate()
  const location = useLocation()

  function handleCancel() {
    if (location.key !== 'default' && window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/login', { replace: true })
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (isSubmitting) return

    const trimmedEmail = email.trim()

    if (!trimmedEmail) {
      setEmailError('Email address is required.')
      return
    }

    setEmailError('')
    setIsSubmitting(true)

    try {
      const response = await requestPasswordReset(trimmedEmail)

      setSubmitted(true)

      toast.success(
        response?.detail ||
          'If an account with that email exists, a password reset link has been sent.'
      )
    } catch (error) {
      const responseData = error.response?.data

      if (responseData?.email) {
        const message = Array.isArray(responseData.email)
          ? responseData.email[0]
          : responseData.email

        setEmailError(message)
      } else if (typeof responseData?.detail === 'string') {
        toast.error(responseData.detail)
      } else if (!error.response) {
        toast.error(
          'Unable to connect to the server. Please check your connection and try again.'
        )
      } else {
        toast.error('Unable to request a password reset. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleEmailChange(event) {
    setEmail(event.target.value)

    if (emailError) {
      setEmailError('')
    }
  }

  function handleTryAnotherEmail() {
    setSubmitted(false)
    setEmailError('')
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card
        title="Forgot your password?"
        description="Enter the email address associated with your account."
      >
        {submitted ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-lg border border-brand-600 bg-brand-50 p-4 text-sm text-brand-700"
            >
              If an account with that email exists, a password reset link has
              been sent. Please check your inbox and spam folder.
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={handleTryAnotherEmail}
            >
              Try another email
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <Input
                id="email"
                name="email"
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={handleEmailChange}
                invalid={Boolean(emailError)}
                required
              />

              {emailError && (
                <p role="alert" className="mt-1.5 text-sm text-red-600">
                  {emailError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Sending request...'
                  : 'Request password reset'}
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
        )}

        <p className="mt-5 text-center text-sm text-text-muted">
          Remember your password?{' '}
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