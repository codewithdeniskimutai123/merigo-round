
import { useEffect, useState } from 'react'

import Card from '../../../../../components/Card.jsx'
import Button from '../../../../../components/Button.jsx'
import Input from '../../../../../components/Input.jsx'

function formatDateTimeLocal(value) {
  if (!value) return ''

  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) {
    return ''
  }

  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16)
}

export default function CycleCreation({
  cycle = null,
  onCreateCycle,
  onUpdateCycle,
  onCancelEdit,
  isCreating = false,
  isUpdating = false,
  group,
}) {
  const [startDate, setStartDate] = useState('')
  const [swapDeadline, setSwapDeadline] = useState('')
  const [errors, setErrors] = useState({})

  const isEditing = Boolean(cycle)
  const isSaving = isCreating || isUpdating

  // Populate the form whenever the selected editing cycle changes.
  // Reset it when the administrator cancels editing.
  useEffect(() => {
    if (cycle) {
      setStartDate(
        cycle.start_date
          ? String(cycle.start_date).slice(0, 10)
          : '',
      )

      setSwapDeadline(
        formatDateTimeLocal(cycle.swap_deadline),
      )
    } else {
      setStartDate('')
      setSwapDeadline('')
    }

    setErrors({})
  }, [
    cycle?.id,
    cycle?.start_date,
    cycle?.swap_deadline,
  ])

  function handleSubmit(event) {
    event.preventDefault()

    if (isSaving) return

    const newErrors = {}

    if (!startDate) {
      newErrors.start_date =
        'Please select a cycle start date.'
    }

    if (!swapDeadline) {
      newErrors.swap_deadline =
        'Please select a swap deadline.'
    } else {
      const deadlineDate = new Date(swapDeadline)

      if (
        !Number.isFinite(deadlineDate.getTime()) ||
        deadlineDate <= new Date()
      ) {
        newErrors.swap_deadline =
          'The swap deadline must be in the future.'
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})

    const cycleData = {
      start_date: startDate,
      swap_deadline: new Date(swapDeadline).toISOString(),
    }

    if (isEditing) {
      if (!onUpdateCycle) return

      onUpdateCycle(cycleData)
    } else {
      if (!onCreateCycle) return

      onCreateCycle(cycleData)
    }
  }

  function handleCancelEdit() {
    if (isSaving) return

    setErrors({})
    onCancelEdit?.()
  }

  return (
    <Card
      title={
        isEditing
          ? 'Edit savings cycle'
          : 'Create a savings cycle'
      }
      description={
        isEditing
          ? `Update the dates for ${
              cycle.name || `Cycle ${cycle.cycle_number}`
            }.`
          : group?.name
            ? `Set up a new cycle for ${group.name}.`
            : 'Set the dates for the new savings cycle.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            id="cycle-start-date"
            name="start_date"
            type="date"
            label="Cycle start date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value)

              setErrors((previous) => ({
                ...previous,
                start_date: '',
              }))
            }}
            error={errors.start_date}
            required
            disabled={isSaving}
          />

          <Input
            id="cycle-swap-deadline"
            name="swap_deadline"
            type="datetime-local"
            label="Position swap deadline"
            value={swapDeadline}
            onChange={(event) => {
              setSwapDeadline(event.target.value)

              setErrors((previous) => ({
                ...previous,
                swap_deadline: '',
              }))
            }}
            error={errors.swap_deadline}
            required
            disabled={isSaving}
          />
        </div>

        <div className="rounded-lg border border-border bg-surface-secondary p-4">
          <p className="text-sm leading-6 text-text-muted">
            Members will be able to select their draw options and
            request position swaps before the swap deadline.
            The administrator can finalize the payout order
            after the deadline.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          {isEditing && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              Cancel editing
            </Button>
          )}

          <Button
            type="submit"
            disabled={
              isSaving ||
              (isEditing && !onUpdateCycle) ||
              (!isEditing && !onCreateCycle)
            }
          >
            {isSaving
              ? isEditing
                ? 'Updating cycle...'
                : 'Creating cycle...'
              : isEditing
                ? 'Save changes'
                : 'Create cycle'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
