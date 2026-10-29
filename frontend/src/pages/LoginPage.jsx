
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

  function handleSubmit(event) {
    event.preventDefault()

    if (loginMutation.isPending) {
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
    const credential = credentialResponse?.credential

    if (!credential) {
      toast.error('Google did not return a sign-in credential.')
      return
    }

    if (googleLoading) {
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
    toast.error('Google sign-in was unsuccessful. Please try again.')
  }

  return (
    <div className="mx-auto w-full max-w-md">
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
                onClick={() => setShowPassword((current) => !current)}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                {showPassword ? 'Hide password' : 'Show password'}
              </button>

              <Link
                to="/forgot-password"
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" disabled={loginMutation.isPending}>
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
            <p className="text-sm text-text-muted">
              Signing in with Google...
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
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-brand-600 hover:underline"
          >
            Create account
          </Link>
        </p>
      </Card>
    </div>
  )
}
