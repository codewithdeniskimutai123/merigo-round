import { useState } from 'react'

import Button from './Button.jsx'
import Input from './Input.jsx'

const defaultForm = {
  name: '',
  description: '',
  contribution_amount: '',
  frequency: 'MONTHLY',
  start_date: '',
  max_members: '20',
}

export default function GroupForm({
  initialValues = defaultForm,
  onSubmit,
  onCancel,
  isPending = false,
  submitLabel = 'Save group',
  pendingLabel = 'Saving group...',
  cancelLabel = 'Cancel',
  validateStartDate = false,
}) {
  const [form, setForm] = useState(() => ({
    ...defaultForm,
    ...initialValues,
    contribution_amount:
      initialValues.contribution_amount ?? defaultForm.contribution_amount,
    max_members: initialValues.max_members ?? defaultForm.max_members,
  }))

  const [errors, setErrors] = useState({})

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setErrors((current) => ({
      ...current,
      [name]: '',
    }))
  }

  function validateForm() {
    const newErrors = {}

    if (!form.name.trim()) {
      newErrors.name = 'Group name is required.'
    } else if (form.name.trim().length < 3) {
      newErrors.name = 'Group name must be at least 3 characters.'
    }

    if (!form.contribution_amount) {
      newErrors.contribution_amount = 'Contribution amount is required.'
    } else if (
      !Number.isFinite(Number(form.contribution_amount)) ||
      Number(form.contribution_amount) <= 0
    ) {
      newErrors.contribution_amount = 'Enter an amount greater than zero.'
    }

    if (!form.frequency) {
      newErrors.frequency = 'Please select a contribution frequency.'
    }

    if (!form.start_date) {
      newErrors.start_date = 'Please select a start date.'
    } else if (validateStartDate) {
      const selectedDate = new Date(`${form.start_date}T00:00:00`)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (selectedDate < today) {
        newErrors.start_date = 'Start date cannot be in the past.'
      }
    }

    if (!form.max_members) {
      newErrors.max_members = 'Maximum number of members is required.'
    } else if (
      !Number.isInteger(Number(form.max_members)) ||
      Number(form.max_members) < 2
    ) {
      newErrors.max_members = 'A group must have at least two members.'
    }

    setErrors(newErrors)

    return Object.keys(newErrors).length === 0
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (isPending || !validateForm()) return

    onSubmit({
      name: form.name.trim(),
      description: form.description.trim(),
      contribution_amount: Number(form.contribution_amount),
      frequency: form.frequency,
      start_date: form.start_date,
      max_members: Number(form.max_members),
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <fieldset
        disabled={isPending}
        className="space-y-5 disabled:opacity-70"
      >
        <Input
          id="name"
          name="name"
          label="Group name"
          placeholder="e.g. Eldoret Women Investment Group"
          value={form.name}
          onChange={handleChange}
          error={errors.name}
          required
          disabled={isPending}
        />

        <div className="w-full space-y-1.5">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-text"
          >
            Description
          </label>

          <textarea
            id="description"
            name="description"
            rows={4}
            value={form.description}
            onChange={handleChange}
            disabled={isPending}
            placeholder="Describe the purpose of your savings group..."
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? 'description-error' : undefined
            }
            className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          />

          {errors.description && (
            <p
              id="description-error"
              role="alert"
              className="text-sm text-red-600"
            >
              {errors.description}
            </p>
          )}
        </div>

        <Input
          id="contribution_amount"
          name="contribution_amount"
          label="Contribution amount (KSh)"
          type="number"
          placeholder="5000"
          value={form.contribution_amount}
          onChange={handleChange}
          error={errors.contribution_amount}
          required
          disabled={isPending}
        />

        <div className="w-full space-y-1.5">
          <label
            htmlFor="frequency"
            className="block text-sm font-medium text-text"
          >
            Contribution frequency
            <span className="ml-1 text-red-600">*</span>
          </label>

          <select
            id="frequency"
            name="frequency"
            value={form.frequency}
            onChange={handleChange}
            disabled={isPending}
            aria-invalid={Boolean(errors.frequency)}
            aria-describedby={
              errors.frequency ? 'frequency-error' : undefined
            }
            className={`w-full rounded-lg border bg-surface px-3 py-2 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50 ${
              errors.frequency ? 'border-red-600' : 'border-border'
            }`}
          >
            <option value="WEEKLY">Weekly</option>
            <option value="BIWEEKLY">Every two weeks</option>
            <option value="MONTHLY">Monthly</option>
          </select>

          {errors.frequency && (
            <p
              id="frequency-error"
              role="alert"
              className="text-sm text-red-600"
            >
              {errors.frequency}
            </p>
          )}
        </div>

        <Input
          id="start_date"
          name="start_date"
          label="Planned start date"
          type="date"
          value={form.start_date}
          onChange={handleChange}
          error={errors.start_date}
          required
          disabled={isPending}
        />

        <Input
          id="max_members"
          name="max_members"
          label="Maximum number of members"
          type="number"
          placeholder="20"
          value={form.max_members}
          onChange={handleChange}
          error={errors.max_members}
          required
          disabled={isPending}
        />

        <p className="text-xs leading-5 text-text-muted">
          The maximum includes you as the group administrator. For example, a
          limit of 20 allows you and 19 other members.
        </p>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isPending}
        >
          {cancelLabel}
        </Button>

        <Button type="submit" disabled={isPending}>
          {isPending && (
            <span
              className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
          )}

          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}