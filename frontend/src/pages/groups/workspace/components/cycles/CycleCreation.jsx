
import { useState } from 'react'

import Card from '../../../../../components/Card.jsx'
import Button from '../../../../../components/Button.jsx'
import Input from '../../../../../components/Input.jsx'

export default function CycleCreation({
  onCreateCycle,
  isCreating,
  group,
}) {
  const [startDate, setStartDate] = useState('')
  const [swapDeadline, setSwapDeadline] = useState('')
  const [errors, setErrors] = useState({})

  function handleSubmit(event) {
    event.preventDefault()

    const newErrors = {}

    if (!startDate) {
      newErrors.start_date = 'Please select a cycle start date.'
    }

    if (!swapDeadline) {
      newErrors.swap_deadline = 'Please select a swap deadline.'
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

    onCreateCycle({
      start_date: startDate,
      swap_deadline: new Date(swapDeadline).toISOString(),
    })
  }

  return (
    <Card
      title="Create a savings cycle"
      description={
        group?.name
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
            disabled={isCreating}
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
            disabled={isCreating}
          />
        </div>

        <div className="rounded-lg border border-border bg-surface-secondary p-4">
          <p className="text-sm leading-6 text-text-muted">
            Members will be able to select their draw options and request
            position swaps before the swap deadline. The administrator
            can finalize the payout order after the deadline.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="submit"
            disabled={isCreating}
          >
            {isCreating ? 'Creating cycle...' : 'Create cycle'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
