import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'

import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import useLogin from '../hooks/useLogin.js'
import { loginWithGoogle } from '../api/authApi.js'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const [errors, setErrors] = useState({
    username: '',
    password: '',
  })

  const navigate = useNavigate()
  const loginMutation = useLogin()

  const isSigningIn = loginMutation.isPending || googleLoading

  function handleSubmit(event) {
    event.preventDefault()

    if (isSigningIn) {
      return
    }

    const validationErrors = {
      username: username.trim() ? '' : 'Username is required.',
      password: password ? '' : 'Password is required.',
    }

    setErrors(validationErrors)

    if (validationErrors.username || validationErrors.password) {
      return
    }

    loginMutation.mutate(
      {
        username: username.trim(),
        password,
      },
      {
        onSuccess: () => {
          navigate('/dashboard', { replace: true })
        },
        onError: (error) => {
          const status = error.response?.status
          const data = error.response?.data

          if (status === 401) {
            toast.error('Incorrect username or password.')
          } else if (!error.response) {
            toast.error(
              'Unable to connect to the server. Please check your connection.',
            )
          } else if (typeof data?.detail === 'string') {
            toast.error(data.detail)
          } else {
            toast.error('Sign-in failed. Please try again.')
          }
        },
      },
    )
  }

  function handleUsernameChange(event) {
    const value = event.target.value
    setUsername(value)

    if (value.trim()) {
      setErrors((previous) => ({
        ...previous,
        username: '',
      }))
    }
  }

  function handlePasswordChange(event) {
    const value = event.target.value
    setPassword(value)

    if (value) {
      setErrors((previous) => ({
        ...previous,
        password: '',
      }))
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    if (isSigningIn) {
      return
    }

    const credential = credentialResponse?.credential

    if (!credential) {
      toast.error('Google did not return a sign-in credential.')
      return
    }

    setGoogleLoading(true)

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

      toast.success('Signed in with Google successfully.')
      navigate('/dashboard', { replace: true })
    } catch (error) {
      console.error('Google sign-in failed:', error)

      const data = error.response?.data

      if (!error.response) {
        toast.error(
          'Unable to connect to the server. Please check your connection.',
        )
      } else if (typeof data?.detail === 'string') {
        toast.error(data.detail)
      } else if (typeof data?.error === 'string') {
        toast.error(data.error)
      } else {
        toast.error(
          'Google sign-in failed. Please check your account and try again.',
        )
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  function handleGoogleError() {
    setGoogleLoading(false)
    toast.error('Google sign-in was unsuccessful. Please try again.')
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div
        className={`relative transition-opacity duration-200 ${
          isSigningIn ? 'pointer-events-none opacity-50' : 'opacity-100'
        }`}
        aria-busy={isSigningIn}
      >
        <Card
          title="Sign in to Merigo Round"
          description="Enter your details to continue to your dashboard."
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <Input
                id="username"
                name="username"
                label="Username"
                placeholder="Enter your username"
                value={username}
                onChange={handleUsernameChange}
                invalid={Boolean(errors.username)}
                required
                disabled={isSigningIn}
              />

              {errors.username && (
                <p role="alert" className="mt-1.5 text-sm text-red-600">
                  {errors.username}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <Input
                  id="password"
                  name="password"
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={handlePasswordChange}
                  invalid={Boolean(errors.password)}
                  required
                  disabled={isSigningIn}
                />

                {errors.password && (
                  <p role="alert" className="mt-1.5 text-sm text-red-600">
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap justify-between gap-3">
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => setShowPassword((current) => !current)}
                  className="text-sm font-medium text-brand-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? 'Hide password' : 'Show password'}
                </button>

                <Link
                  to="/forgot-password"
                  aria-disabled={isSigningIn}
                  tabIndex={isSigningIn ? -1 : 0}
                  onClick={(event) => {
                    if (isSigningIn) event.preventDefault()
                  }}
                  className="text-sm font-medium text-brand-600 hover:underline aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" disabled={isSigningIn}>
              {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-sm text-text-muted">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex min-h-10 justify-center">
            {googleLoading ? (
              <p role="status" className="text-sm text-text-muted">
                Signing in with Google...
              </p>
            ) : (
              <div
                className={
                  isSigningIn
                    ? 'pointer-events-none opacity-50'
                    : ''
                }
              >
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  text="continue_with"
                  shape="rectangular"
                  theme="outline"
                  size="large"
                  width="320"
                />
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-sm text-text-muted">
            Don't have an account?{' '}
            <Link
              to="/register"
              aria-disabled={isSigningIn}
              tabIndex={isSigningIn ? -1 : 0}
              onClick={(event) => {
                if (isSigningIn) event.preventDefault()
              }}
              className="font-medium text-brand-600 hover:underline aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              Create account
            </Link>
          </p>
        </Card>

        {isSigningIn && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/20"
            aria-hidden="true"
          >
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              <span className="text-sm font-medium text-text">
                {googleLoading
                  ? 'Signing in with Google...'
                  : 'Signing in...'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}