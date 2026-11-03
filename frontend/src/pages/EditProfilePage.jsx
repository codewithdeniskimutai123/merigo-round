
import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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

import { useRequestToJoinGroup } from '../hooks/useGroups.js'

import Card from '../components/Card.jsx'
import Input from '../components/Input.jsx'
import Button from '../components/Button.jsx'

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

function getCompletionStatus(form) {
  return [
    {
      field: 'first_name',
      label: 'First name',
      complete: Boolean(form.first_name.trim()),
    },
    {
      field: 'last_name',
      label: 'Last name',
      complete: Boolean(form.last_name.trim()),
    },
    {
      field: 'username',
      label: 'Username',
      complete: Boolean(form.username.trim()),
    },
    {
      field: 'email',
      label: 'Email address',
      complete: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim(),
      ),
    },
    {
      field: 'phone_number',
      label: 'Phone number',
      complete: Boolean(form.phone_number.trim()),
    },
  ]
}

function FieldStatus({ complete }) {
  return (
    <span
      className={`text-xs font-semibold ${
        complete ? 'text-green-600' : 'text-red-600'
      }`}
    >
      {complete ? 'Complete' : 'Required'}
    </span>
  )
}

export default function EditProfilePage({ completionMode = false }) {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  // Identify an action the user intended to perform before completing the profile.
  const pendingAction = location.state?.action

  const joinGroupId =
    pendingAction?.type === 'JOIN_GROUP'
      ? pendingAction.groupId
      : null

  // Reuse the existing group join-request mutation.
  const joinGroupMutation = useRequestToJoinGroup(joinGroupId)

  const fileInputRef = useRef(null)
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

  const completionStatus = getCompletionStatus(form)

  const completedFields = completionStatus.filter(
    (field) => field.complete,
  ).length

  const allFieldsComplete =
    completedFields === completionStatus.length

  const completionPercentage =
    (completedFields / completionStatus.length) * 100

  useEffect(() => {
    if (!profile) return

    setForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      username: profile.username || '',
      email: profile.email || '',
      phone_number: profile.phone_number || '',
    })

    if (!photoFile) {
      setPhotoPreview(getPhotoUrl(profile.profile_photo))
      setPhotoLoadError(false)
    }
  }, [profile, photoFile])

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

    onSuccess: async (updatedProfile) => {
      // Django must confirm completion before we declare success.
      if (
        completionMode &&
        updatedProfile.is_profile_complete !== true
      ) {
        queryClient.setQueryData(
          ['currentUser'],
          updatedProfile,
        )

        localStorage.setItem(
          'user',
          JSON.stringify(updatedProfile),
        )

        window.dispatchEvent(new Event('auth-change'))

        setForm({
          first_name: updatedProfile.first_name || '',
          last_name: updatedProfile.last_name || '',
          username: updatedProfile.username || '',
          email: updatedProfile.email || '',
          phone_number: updatedProfile.phone_number || '',
        })

        setErrors({})

        toast.error(
          'Your profile is still incomplete. Please check the required information.',
        )

        return
      }

      queryClient.setQueryData(
        ['currentUser'],
        updatedProfile,
      )

      localStorage.setItem(
        'user',
        JSON.stringify(updatedProfile),
      )

      window.dispatchEvent(new Event('auth-change'))

      if (temporaryPhotoUrl.current) {
        URL.revokeObjectURL(temporaryPhotoUrl.current)
        temporaryPhotoUrl.current = null
      }

      setPhotoFile(null)
      setPhotoPreview(getPhotoUrl(updatedProfile.profile_photo))
      setPhotoLoadError(false)
      setErrors({})
      setPhotoError('')

      toast.success(
        completionMode
          ? 'Your profile has been completed successfully.'
          : 'Your profile has been updated.',
      )

      // Automatically submit the intended group join request
      // after Django confirms that profile completion succeeded.
      if (
        completionMode &&
        pendingAction?.type === 'JOIN_GROUP' &&
        joinGroupId
      ) {
        try {
          await joinGroupMutation.mutateAsync()
        } catch {
          // The existing group mutation handles its own error notification.
          // The user can retry from the group workspace.
        }

        navigate(`/groups/${joinGroupId}`, { replace: true })
        return
      }

      // Preserve the existing navigation behavior for other profile updates.
      const destination = location.state?.from

      const redirectPath = completionMode
        ? destination
          ? `${destination.pathname}${destination.search || ''}${destination.hash || ''}`
          : '/dashboard'
        : '/profile'

      navigate(redirectPath, { replace: true })
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

    if (completionMode && !allFieldsComplete) {
      const missingFields = completionStatus
        .filter((field) => !field.complete)
        .map((field) => field.label)

      toast.error(
        `Please complete: ${missingFields.join(', ')}.`,
      )

      return
    }

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

    if (completionMode) {
      navigate('/dashboard', { replace: true })
      return
    }

    navigate(-1)
  }

  if (isLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-page px-4 text-text">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />

          <p className="text-sm text-text-muted">
            Loading your profile...
          </p>
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

        {/* Page heading */}
        <header>
          <p className="text-sm font-semibold tracking-wide text-brand-600">
            MERIGO ROUND
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {completionMode ? 'Complete Your Profile' : 'Edit Profile'}
          </h1>

          <p className="mt-2 text-sm text-text-muted">
            {completionMode
              ? 'Before creating or joining a group, provide the required information below.'
              : 'Update your personal information and profile photo.'}
          </p>
        </header>

        {/* Complete profile mode */}
        {completionMode && (
          <Card className="space-y-6 sm:p-8">

            {/* Completion requirements */}
            <div className="rounded-xl border border-red-600/20 bg-red-600/5 p-4">
              <h2 className="font-semibold text-red-600">
                Profile completion requirements
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                A complete profile must contain your first name,
                last name, registered username, valid email address
                and active phone number. All five details are required
                before you can create or join a group.
              </p>

              <p className="mt-2 text-sm text-text-muted">
                Your profile photo is optional and is not required
                for profile completion.
              </p>
            </div>

            {/* Completion progress */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">
                  Your completion progress
                </h2>

                <span className="text-sm font-bold text-brand-600">
                  {completedFields} of {completionStatus.length} completed
                </span>
              </div>

              <div
                className="h-2.5 overflow-hidden rounded-full bg-page"
                role="progressbar"
                aria-label="Profile completion progress"
                aria-valuemin={0}
                aria-valuemax={completionStatus.length}
                aria-valuenow={completedFields}
              >
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              <div className="space-y-2">
                {completionStatus.map((field) => (
                  <div
                    key={field.field}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">
                      {field.label}
                    </span>

                    <FieldStatus complete={field.complete} />
                  </div>
                ))}
              </div>
            </div>

            {/* Required information */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">

                {/* First name */}
                <div>
                  <div className="mb-1 flex justify-end">
                    <FieldStatus
                      complete={completionStatus.find(
                        (field) => field.field === 'first_name',
                      ).complete}
                    />
                  </div>

                  <Input
                    id="first_name"
                    label="First name"
                    value={form.first_name}
                    onChange={handleChange}
                    required
                    disabled={updateMutation.isPending}
                    error={
                      errors.first_name ||
                      (!form.first_name.trim()
                        ? 'Your first name is required.'
                        : '')
                    }
                    placeholder="Enter your first name"
                  />
                </div>

                {/* Last name */}
                <div>
                  <div className="mb-1 flex justify-end">
                    <FieldStatus
                      complete={completionStatus.find(
                        (field) => field.field === 'last_name',
                      ).complete}
                    />
                  </div>

                  <Input
                    id="last_name"
                    label="Last name"
                    value={form.last_name}
                    onChange={handleChange}
                    required
                    disabled={updateMutation.isPending}
                    error={
                      errors.last_name ||
                      (!form.last_name.trim()
                        ? 'Your last name is required.'
                        : '')
                    }
                    placeholder="Enter your last name"
                  />
                </div>

                {/* Username */}
                <div>
                  <div className="mb-1 flex justify-end">
                    <FieldStatus
                      complete={completionStatus.find(
                        (field) => field.field === 'username',
                      ).complete}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="username"
                      className="block text-sm font-medium text-text"
                    >
                      Username
                    </label>

                    <input
                      id="username"
                      name="username"
                      value={form.username}
                      readOnly
                      aria-invalid={!form.username.trim()}
                      className="w-full cursor-not-allowed rounded-lg border border-border bg-page px-3 py-2 text-text-muted"
                    />

                    {!form.username.trim() ? (
                      <p className="text-sm text-red-600">
                        A registered username is required.
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted">
                        Your registered username is already associated
                        with your account and cannot be changed here.
                      </p>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <div className="mb-1 flex justify-end">
                    <FieldStatus
                      complete={completionStatus.find(
                        (field) => field.field === 'email',
                      ).complete}
                    />
                  </div>

                  <Input
                    id="email"
                    label="Email address"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    disabled={updateMutation.isPending}
                    error={
                      errors.email ||
                      (!form.email.trim()
                        ? 'A valid email address is required.'
                        : !completionStatus.find(
                            (field) => field.field === 'email',
                          ).complete
                          ? 'Please enter a valid email address.'
                          : '')
                    }
                    placeholder="Enter your email address"
                  />
                </div>

                {/* Phone number */}
                <div className="sm:col-span-2">
                  <div className="mb-1 flex justify-end">
                    <FieldStatus
                      complete={completionStatus.find(
                        (field) => field.field === 'phone_number',
                      ).complete}
                    />
                  </div>

                  <Input
                    id="phone_number"
                    label="Phone number"
                    type="tel"
                    value={form.phone_number}
                    onChange={handleChange}
                    required
                    disabled={updateMutation.isPending}
                    error={
                      errors.phone_number ||
                      (!form.phone_number.trim()
                        ? 'An active phone number is required.'
                        : '')
                    }
                    placeholder="Enter your active phone number"
                  />
                </div>
              </div>

              {errors.general && (
                <p role="alert" className="text-sm text-red-600">
                  {errors.general}
                </p>
              )}

              {!allFieldsComplete && (
                <div className="rounded-lg border border-red-600/20 bg-red-600/5 p-3">
                  <p className="text-sm text-red-600">
                    Complete all required fields above to submit your profile.
                  </p>
                </div>
              )}

              {/* Completion actions */}
              <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                <Button
                  type="submit"
                  disabled={
                    updateMutation.isPending ||
                    !allFieldsComplete
                  }
                >
                  {updateMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving profile...
                    </span>
                  ) : allFieldsComplete ? (
                    'Complete profile'
                  ) : (
                    'Complete the required fields'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Normal edit profile mode */}
        {!completionMode && (
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
                    disabled={updateMutation.isPending}
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
                    disabled={updateMutation.isPending}
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
                    disabled={updateMutation.isPending}
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
                    disabled={updateMutation.isPending}
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
        )}
      </div>
    </main>
  )
}
