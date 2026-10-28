
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
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
                Your request has been recorded in this page. Email delivery
                will be enabled when we connect Django.
              </div>

              <Button
                variant="secondary"
                onClick={() => setSubmitted(false)}
              >
                Try another email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                id="email"
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <Button type="submit">
                Request password reset
              </Button>
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
