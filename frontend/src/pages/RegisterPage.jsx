
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'

import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import { registerUser, loginWithGoogle } from '../api/authApi.js'

function validateForm(formData) {
  const errors = {}

  if (!formData.username.trim()) {
    errors.username = 'Username is required.'
  }

  if (!formData.email.trim()) {
    errors.email = 'Email address is required.'
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
  ) {
    errors.email = 'Enter a valid email address.'
  }

  if (!formData.phone_number.trim()) {
    errors.phone_number = 'Phone number is required.'
  }

  if (!formData.password) {
    errors.password = 'Password is required.'
  } else if (formData.password.length < 8) {
    errors.password = 'Password must contain at least 8 characters.'
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.'
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

function getRegistrationErrors(error) {
  const data = error.response?.data
  const fieldErrors = {}

  const fields = ['username', 'email', 'phone_number', 'password']

  for (const field of fields) {
    const message = data?.[field]

    if (Array.isArray(message) && message.length) {
      fieldErrors[field] = message[0]
    } else if (typeof message === 'string') {
      fieldErrors[field] = message
    }
  }

  if (Array.isArray(data?.non_field_errors)) {
    fieldErrors.form = data.non_field_errors[0]
  } else if (typeof data?.detail === 'string') {
    fieldErrors.form = data.detail
  }

  if (!error.response) {
    fieldErrors.form =
      'Unable to connect to the server. Please check your connection.'
  }

  if (!Object.keys(fieldErrors).length) {
    fieldErrors.form =
      'Registration failed. Please check your details and try again.'
  }

  return fieldErrors
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const location = useLocation()

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [googleLoading, setGoogleLoading] = useState(false)

  function handleCancel() {
    const hasPreviousPage =
      location.key !== 'default' && window.history.length > 1

    if (hasPreviousPage) {
      navigate(-1)
    } else {
      navigate('/', { replace: true })
    }
  }

  const registrationMutation = useMutation({
    mutationFn: registerUser,

    onSuccess: () => {
      toast.success('Your account has been created successfully.')
      navigate('/login', { replace: true })
    },

    onError: (error) => {
      setErrors(getRegistrationErrors(error))
    },
  })

  function handleChange(event) {
    const { name, value } = event.target

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }))

    setErrors((previous) => ({
      ...previous,
      [name]: '',
      form: '',
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (registrationMutation.isPending || googleLoading) {
      return
    }

    const validationErrors = validateForm(formData)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      return
    }

    registrationMutation.mutate({
      username: formData.username.trim(),
      email: formData.email.trim(),
      phone_number: formData.phone_number.trim(),
      password: formData.password,
    })
  }

  async function handleGoogleSuccess(credentialResponse) {
    const credential = credentialResponse?.credential

    if (!credential) {
      toast.error('Google did not return a sign-in credential.')
      return
    }

    if (googleLoading || registrationMutation.isPending) {
      return
    }

    setGoogleLoading(true)
    setErrors({})

    try {
      const data = await loginWithGoogle(credential)

      if (!data?.access || !data?.refresh) {
        throw new Error(
          'The server did not return the required authentication tokens.',
        )
      }

      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)

      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      window.dispatchEvent(new Event('auth-change'))

      toast.success('You are signed in with Google successfully.')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Google registration/sign-in failed:', error)

      const data = error.response?.data

      if (!error.response) {
        toast.error(
          'Unable to connect to the server. Please check your connection.',
        )
      } else if (typeof data?.detail === 'string') {
        toast.error(data.detail)
      } else if (Array.isArray(data?.token) && data.token.length) {
        toast.error(data.token[0])
      } else if (typeof data?.error === 'string') {
        toast.error(data.error)
      } else {
        toast.error(
          'Google sign-up failed. Please try again.',
        )
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  function handleGoogleError() {
    toast.error('Google sign-in was unsuccessful. Please try again.')
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <Card
        title="Create your account"
        description="Enter your details to get started."
      >
        {errors.form && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          >
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div>
            <Input
              id="username"
              name="username"
              label="Username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              invalid={Boolean(errors.username)}
              required
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.username}
              </p>
            )}
          </div>

          <div>
            <Input
              id="email"
              name="email"
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              invalid={Boolean(errors.email)}
              required
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <Input
              id="phone_number"
              name="phone_number"
              label="Phone number"
              type="tel"
              placeholder="e.g. 0712345678"
              value={formData.phone_number}
              onChange={handleChange}
              invalid={Boolean(errors.phone_number)}
              required
            />
            {errors.phone_number && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.phone_number}
              </p>
            )}
          </div>

          <div>
            <Input
              id="password"
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange}
              invalid={Boolean(errors.password)}
              required
            />

            {errors.password && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.password}
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              className="mt-2 text-sm font-medium text-brand-600 hover:underline"
            >
              {showPassword ? 'Hide password' : 'Show password'}
            </button>
          </div>

          <div>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Enter your password again"
              value={formData.confirmPassword}
              onChange={handleChange}
              invalid={Boolean(errors.confirmPassword)}
              required
            />

            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600" role="alert">
                {errors.confirmPassword}
              </p>
            )}

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword((previous) => !previous)
              }
              className="mt-2 text-sm font-medium text-brand-600 hover:underline"
            >
              {showConfirmPassword ? 'Hide password' : 'Show password'}
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              disabled={
                registrationMutation.isPending || googleLoading
              }
            >
              {registrationMutation.isPending
                ? 'Creating account...'
                : 'Create account'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={
                registrationMutation.isPending || googleLoading
              }
            >
              Cancel
            </Button>
          </div>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-sm text-text-muted">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="flex min-h-10 justify-center">
          {googleLoading ? (
            <p className="text-sm text-text-muted">
              Creating your account or signing you in...
            </p>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="continue_with"
              shape="rectangular"
              theme="outline"
              size="large"
              width="320"
            />
          )}
        </div>

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
