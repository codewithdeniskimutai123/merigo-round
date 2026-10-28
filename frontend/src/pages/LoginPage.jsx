
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'
import useLogin from '../hooks/useLogin.js'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const navigate = useNavigate()
  const loginMutation = useLogin()

  function handleSubmit(event) {
    event.preventDefault()

    if (!username.trim() || !password) {
      toast.error('Enter your username and password.')
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
      },
    )
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card
        title="Sign in to Merigo Round"
        description="Enter your details to continue to your dashboard."
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="username"
            label="Username"
            placeholder="Enter your username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

          <div className="space-y-2">
            <Input
              id="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

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
