
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { loginUser } from '../api/authApi.js'

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
      const message =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        error.message ||
        'Login failed. Please try again.'

      toast.error(message)
    },
  })
}
