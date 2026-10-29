
import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getCurrentUser,
  updateCurrentUser,
} from '../api/authApi.js'

const emptyForm = {
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  phone_number: '',
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '')

function getPhotoUrl(photo) {
  if (!photo || typeof photo !== 'string') return ''

  if (/^https?:\/\//i.test(photo)) {
    return photo
  }

  // Handle paths returned by Django, such as /media/profile_photos/photo.jpg.
  const path = photo.replace(/^\/+/, '')
  return `${API_BASE_URL}/${path}`
}

function getProfileErrors(error) {
  const data = error?.response?.data

  if (!data || typeof data !== 'object') {
    return {
      general:
        error?.message ||
        'Unable to save your profile. Please try again.',
    }
  }

  const errors = {}

  for (const [field, messages] of Object.entries(data)) {
    errors[field] = Array.isArray(messages)
      ? messages.join(' ')
      : String(messages)
  }

  return errors
}

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not available'
  }

  return date.toLocaleString()
}

export default function EditProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)

  // Keep track of the temporary preview URL we create in the browser.
  const temporaryPhotoUrl = useRef(null)

  const [form, setForm] = useState(emptyForm)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoLoadError, setPhotoLoadError] = useState(false)
  const [errors, setErrors] = useState({})
  const [photoError, setPhotoError] = useState('')

  const {
    data: profile,
    isLoading,
    isError,
    error: loadError,
  } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Load the latest profile fields and saved photo from Django.
  useEffect(() => {
    if (!profile) return

    setForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      username: profile.username || '',
      email: profile.email || '',
      phone_number: profile.phone_number || '',
    })

    // Never overwrite a newly selected local photo with the saved photo.
    if (!photoFile) {
      setPhotoPreview(getPhotoUrl(profile.profile_photo))
      setPhotoLoadError(false)
    }
  }, [profile, photoFile])

  // Clean up a temporary image URL only when the component unmounts.
  // Replacing a preview is handled explicitly in handlePhotoChange.
  useEffect(() => {
    return () => {
      if (temporaryPhotoUrl.current) {
        URL.revokeObjectURL(temporaryPhotoUrl.current)
        temporaryPhotoUrl.current = null
      }
    }
  }, [])

  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,

    onSuccess: (updatedProfile) => {
      // Refresh cached profile data for the profile page and other components.
      queryClient.setQueryData(['currentUser'], updatedProfile)

      localStorage.setItem('user', JSON.stringify(updatedProfile))
      window.dispatchEvent(new Event('auth-change'))

      // Release the temporary preview before switching to the saved image.
      if (temporaryPhotoUrl.current) {
        URL.revokeObjectURL(temporaryPhotoUrl.current)
        temporaryPhotoUrl.current = null
      }

      setPhotoFile(null)
      setPhotoPreview(getPhotoUrl(updatedProfile.profile_photo))
      setPhotoLoadError(false)
      setErrors({})
      setPhotoError('')

      toast.success('Your profile has been updated.')

      // Redirect only after Django confirms the update succeeded.
      navigate('/profile', { replace: true })
    },

    onError: (error) => {
      const fieldErrors = getProfileErrors(error)

      setErrors(fieldErrors)

      if (fieldErrors.profile_photo) {
        setPhotoError(fieldErrors.profile_photo)
      }

      const generalMessage =
        fieldErrors.general ||
        fieldErrors.detail ||
        fieldErrors.non_field_errors

      if (generalMessage) {
        toast.error(
          typeof generalMessage === 'string'
            ? generalMessage
            : 'Unable to save your profile. Check the highlighted fields.',
        )
      } else {
        toast.error(
          'Profile update failed. Please check the highlighted fields.',
        )
      }
    },
  })

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => ({
      ...current,
      [name]: '',
      general: '',
    }))
  }

  function handlePhotoChange(event) {
    const input = event.target
    const file = input.files?.[0]

    // Reset immediately so the same file can be selected again.
    input.value = ''

    if (!file) return

    setPhotoError('')

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose a valid image file.')
      toast.error('Please choose a valid image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('The profile photo must be 5 MB or smaller.')
      toast.error('The profile photo must be 5 MB or smaller.')
      return
    }

    // Release the previous temporary URL before creating another one.
    if (temporaryPhotoUrl.current) {
      URL.revokeObjectURL(temporaryPhotoUrl.current)
    }

    const newPreviewUrl = URL.createObjectURL(file)

    temporaryPhotoUrl.current = newPreviewUrl

    setPhotoFile(file)
    setPhotoPreview(newPreviewUrl)
    setPhotoLoadError(false)

    setErrors((current) => ({
      ...current,
      profile_photo: '',
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (updateMutation.isPending) return

    setErrors({})
    setPhotoError('')

    const formData = new FormData()

    formData.append('first_name', form.first_name.trim())
    formData.append('last_name', form.last_name.trim())
    formData.append('email', form.email.trim())
    formData.append('phone_number', form.phone_number.trim())

    if (photoFile) {
      formData.append('profile_photo', photoFile)
    }

    updateMutation.mutate(formData)
  }

  function handleCancel() {
    if (updateMutation.isPending) return

    navigate(-1)
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-page px-4 py-8 text-text">
        <div className="mx-auto max-w-4xl">
          Loading your profile...
        </div>
      </main>
    )
  }

  if (isError) {
    return (
      <main className="min-h-screen bg-page px-4 py-8 text-text">
        <div className="mx-auto max-w-4xl space-y-4">
          <h1 className="text-2xl font-bold">
            Unable to load your profile
          </h1>

          <p className="text-text-muted">
            {loadError?.response?.data?.detail ||
              'Please check your connection and sign in again if necessary.'}
          </p>

          <Link
            to="/profile"
            className="inline-block font-semibold text-brand-600 hover:underline"
          >
            Back to profile
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-page text-text transition-colors">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <p className="text-sm font-semibold text-brand-600">
            MERIGO ROUND
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Edit Profile
          </h1>

          <p className="mt-2 text-sm text-text-muted">
            Update your personal information and profile photo.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
          <div className="mb-7 border-b border-border pb-5">
            <h2 className="text-xl font-semibold">
              Personal information
            </h2>

            <p className="mt-2 text-sm text-text-muted">
              Keep your contact details up to date.
            </p>
          </div>

          {errors.general && (
            <p role="alert" className="mb-4 text-sm text-red-600">
              {errors.general}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile photo */}
            <div>
              <label
                htmlFor="profilePhoto"
                className="mb-3 block text-sm font-medium"
              >
                Profile photo
              </label>

              <div className="flex flex-wrap items-center gap-5">
                {photoPreview && !photoLoadError ? (
                  <img
                    key={photoPreview}
                    src={photoPreview}
                    alt="Profile preview"
                    onLoad={() => setPhotoLoadError(false)}
                    onError={() => {
                      console.error(
                        'Profile photo failed to load:',
                        photoPreview,
                      )
                      setPhotoLoadError(true)
                    }}
                    className="h-24 w-24 shrink-0 rounded-full border border-border bg-page object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-border bg-page px-2 text-center text-sm text-text-muted">
                    {photoPreview ? 'Photo unavailable' : 'No photo'}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <input
                    ref={fileInputRef}
                    id="profilePhoto"
                    name="profile_photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={updateMutation.isPending}
                    className="peer sr-only"
                    aria-describedby="profilePhotoHelp"
                  />

                  <label
                    htmlFor="profilePhoto"
                    onClick={(event) => {
                      if (updateMutation.isPending) {
                        event.preventDefault()
                        return
                      }

                      // Open the file chooser explicitly for reliable reuse.
                      event.preventDefault()
                      fileInputRef.current?.click()
                    }}
                    className="inline-flex min-h-12 cursor-pointer select-none items-center justify-center rounded-xl border-2 border-brand-600 bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:border-brand-700 hover:bg-brand-700 hover:shadow-lg active:translate-y-0 active:scale-95 active:shadow-sm peer-focus-visible:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-brand-600/30 peer-disabled:pointer-events-none peer-disabled:opacity-50"
                  >
                    {photoFile
                      ? 'Choose another photo'
                      : 'Choose profile photo'}
                  </label>

                  <p
                    id="profilePhotoHelp"
                    className="mt-2 break-words text-xs text-text-muted"
                  >
                    {photoFile
                      ? `Selected: ${photoFile.name}`
                      : 'Choose an image up to 5 MB.'}
                  </p>

                  {photoError && (
                    <p role="alert" className="mt-2 text-sm text-red-600">
                      {photoError}
                    </p>
                  )}

                  {errors.profile_photo && !photoError && (
                    <p role="alert" className="mt-2 text-sm text-red-600">
                      {errors.profile_photo}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Editable personal information */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="first_name"
                  className="mb-2 block text-sm font-medium"
                >
                  First name
                </label>

                <input
                  id="first_name"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-page px-4 py-3 text-text outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />

                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.first_name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="last_name"
                  className="mb-2 block text-sm font-medium"
                >
                  Last name
                </label>

                <input
                  id="last_name"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-border bg-page px-4 py-3 text-text outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />

                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.last_name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium"
                >
                  Username
                </label>

                <input
                  id="username"
                  name="username"
                  value={form.username}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-border bg-page px-4 py-3 text-text-muted"
                />

                <p className="mt-1 text-xs text-text-muted">
                  Your username cannot be changed here.
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-border bg-page px-4 py-3 text-text outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />

                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="phone_number"
                  className="mb-2 block text-sm font-medium"
                >
                  Phone number
                </label>

                <input
                  id="phone_number"
                  name="phone_number"
                  type="tel"
                  value={form.phone_number}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-border bg-page px-4 py-3 text-text outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
                />

                {errors.phone_number && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.phone_number}
                  </p>
                )}
              </div>
            </div>

            {/* Account information */}
            <div className="border-t border-border pt-6">
              <h2 className="text-xl font-semibold">
                Account information
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-text-muted">Account ID</p>
                  <p className="mt-1 font-medium">
                    {profile?.id ?? 'Not available'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-text-muted">Date created</p>
                  <p className="mt-1 font-medium">
                    {formatDate(profile?.created_at)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-text-muted">Last updated</p>
                  <p className="mt-1 font-medium">
                    {formatDate(profile?.updated_at)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 border-t border-border pt-6">
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updateMutation.isPending
                  ? 'Saving changes...'
                  : 'Save changes'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="rounded-xl border border-border px-6 py-3 font-semibold transition-all duration-200 hover:border-brand-600 hover:bg-brand-600/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <Link
                to="/change-password"
                className="rounded-xl px-4 py-3 font-semibold text-brand-600 transition-colors hover:bg-brand-600/10 hover:underline"
              >
                Change password
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
