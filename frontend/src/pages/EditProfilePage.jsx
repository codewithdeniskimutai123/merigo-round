
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const initialForm = {
  first_name: 'Denis',
  last_name: 'Kimutai',
  username: 'deniskimutai',
  email: 'denis@example.com',
  phone_number: '+254 712 345 678',
}

export default function EditProfilePage() {
  const [form, setForm] = useState(initialForm)
  const [photoPreview, setPhotoPreview] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setMessage('')
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage('Please choose a valid image file.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('The profile photo must be 5 MB or smaller.')
      return
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setMessage('')
  }

  function handleSubmit(event) {
    event.preventDefault()

    setMessage(
      `Your form is valid. Profile changes${photoFile ? ', including the selected photo,' : ''} are not saved to Django yet.`
    )
  }

  return (

      <main className="min-h-screen bg-page text-text transition-colors">
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-brand-600">
                MERIGO ROUND
              </p>
              <h1 className="mt-2 text-3xl font-bold">Edit Profile</h1>
              <p className="mt-2 text-sm text-text-muted">
                Update your personal information and profile photo.
              </p>
            </div>
          </header>

          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
            <div className="mb-7 border-b border-border pb-5">
              <h2 className="text-xl font-semibold">Personal information</h2>
              <p className="mt-2 text-sm text-text-muted">
                Keep your contact details up to date.
              </p>
            </div>

            {message && (
              <div
                role="status"
                className="mb-6 rounded-xl border border-border bg-page p-4 text-sm text-text"
              >
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium" htmlFor="profilePhoto">
                  Profile photo
                </label>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Selected profile preview"
                      className="h-24 w-24 rounded-full border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-page text-sm text-text-muted">
                      No photo
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      id="profilePhoto"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="block w-full text-sm text-text-muted file:mr-4 file:rounded-lg file:border file:border-border file:bg-surface file:px-4 file:py-2 file:font-medium file:text-text hover:file:bg-page"
                    />
                    <p className="mt-2 text-xs text-text-muted">
                      Select an image up to 5 MB. It will only be previewed
                      until backend upload is connected.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="first_name" className="mb-2 block text-sm font-medium">
                    First name
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    autoComplete="given-name"
                    required
                    className="w-full rounded-lg border border-border bg-page px-4 py-3 text-text outline-none focus:border-brand-600"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="mb-2 block text-sm font-medium">
                    Last name
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    autoComplete="family-name"
                    required
                    className="w-full rounded-lg border border-border bg-page px-4 py-3 text-text outline-none focus:border-brand-600"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="mb-2 block text-sm font-medium">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    value={form.username}
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-border bg-page px-4 py-3 text-text-muted"
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    Usernames cannot be edited from this form.
                  </p>
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                    className="w-full rounded-lg border border-border bg-page px-4 py-3 text-text outline-none focus:border-brand-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="phone_number" className="mb-2 block text-sm font-medium">
                    Phone number
                  </label>
                  <input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    value={form.phone_number}
                    onChange={handleChange}
                    autoComplete="tel"
                    required
                    className="w-full rounded-lg border border-border bg-page px-4 py-3 text-text outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h2 className="text-lg font-semibold">Account information</h2>
                <p className="mt-1 text-sm text-text-muted">
                  These fields are managed by the application and cannot be
                  changed here.
                </p>

                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-text-muted">Account ID</p>
                    <p className="mt-1 font-medium">Available after backend connection</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Account status</p>
                    <p className="mt-1 font-medium">Available after backend connection</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Date created</p>
                    <p className="mt-1 font-medium">Available after backend connection</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Last updated</p>
                    <p className="mt-1 font-medium">Available after backend connection</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-border pt-6">
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Save changes
                </button>

                <Link
                  to="/profile"
                  className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-text hover:bg-page"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </section>

          <p className="text-sm text-text-muted">
            Need to change your password?{' '}
            <Link
              to="/change-password"
              className="font-semibold text-brand-600 hover:underline"
            >
              Change password
            </Link>
          </p>
        </div>
      </main>

  )
}
