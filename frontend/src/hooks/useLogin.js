
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { loginUser } from '../api/authApi.js'

function getLoginErrorMessage(error) {
  const data = error.response?.data

  if (typeof data?.detail === 'string') {
    return data.detail
  }

  if (Array.isArray(data?.non_field_errors)) {
    return data.non_field_errors[0]
  }

  if (Array.isArray(data?.username)) {
    return data.username[0]
  }

  if (Array.isArray(data?.password)) {
    return data.password[0]
  }

  if (!error.response) {
    return 'Unable to connect to the server. Check your connection and try again.'
  }

  return 'Login failed. Please check your credentials and try again.'
}

export default function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials) => {
      const data = await loginUser(credentials)

      if (!data.access) {
        throw new Error('The server did not return an access token.')
      }

      return data
    },

    onSuccess: (data, credentials) => {
      localStorage.setItem('access', data.access)

      if (data.refresh) {
        localStorage.setItem('refresh', data.refresh)
      } else {
        localStorage.removeItem('refresh')
      }

      const user = data.user || {
        username: credentials.username,
      }

      localStorage.setItem('user', JSON.stringify(user))
      queryClient.setQueryData(['currentUser'], user)

      window.dispatchEvent(new Event('auth-change'))

      toast.success('Welcome back! Login successful.')
    },

    onError: (error) => {
      toast.error(
        error.message === 'The server did not return an access token.'
          ? error.message
          : getLoginErrorMessage(error),
      )
    },
  })
}
