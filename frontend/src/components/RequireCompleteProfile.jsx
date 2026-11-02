
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '../api/authApi.js'

export default function RequireCompleteProfile() {
  const location = useLocation()

  const {
    data: user,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 0,
    refetchOnMount: 'always',
  })


  if (isLoading || isFetching) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
          <p className="text-sm text-text-muted">
            Checking your profile...
          </p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
        <p className="text-text">
          We couldn't verify your profile. Please try again.
        </p>

        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-white hover:bg-brand-700"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!user?.is_profile_complete) {
    return (
      <Navigate
        to="/complete-profile"
        replace
        state={{ from: location }}
      />
    )
  }

  return <Outlet />
}
