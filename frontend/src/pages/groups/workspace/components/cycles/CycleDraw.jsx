
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import Card from '../../../../../components/Card.jsx'
import Button from '../../../../../components/Button.jsx'

import {
  useSelectCycleDrawOption,
} from '../../../../../hooks/useCycles.js'

const EMPTY_OPTIONS = []

const DRAW_SYMBOLS = [
  { symbol: '✿', style: 'text-brand-600' },
  { symbol: '☾', style: 'text-text-muted' },
  { symbol: '◇', style: 'text-brand-700' },
  { symbol: '✧', style: 'text-brand-600' },
  { symbol: '❋', style: 'text-text' },
  { symbol: '∞', style: 'text-brand-700' },
]

function shuffleOptions(options) {
  const shuffled = [...options]

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))

    ;[shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ]
  }

  return shuffled
}

export default function CycleDraw({
  groupId,
  cycleId,
  drawData,
  orderData,
  isAdmin,
  isDraft,
}) {
  const [selectedOption, setSelectedOption] = useState('')

  const selectDrawMutation = useSelectCycleDrawOption(
    groupId,
    cycleId,
  )

  // The backend returns UUID token strings.
  const options = Array.isArray(drawData?.options)
    ? drawData.options
    : EMPTY_OPTIONS

  // Shuffle the visual presentation without changing backend tokens.
  const shuffledOptions = useMemo(
    () => shuffleOptions(options),
    [options],
  )

  // Check whether the current member has already selected.
  const hasSelected =
    drawData?.has_selected === true ||
    orderData?.my_draw_status?.has_selected === true

  // The draw is complete when all members have selected.
  const drawComplete =
    drawData?.draw_complete === true ||
    orderData?.draw_complete === true

  const remainingOptions = drawData?.remaining_options ?? 0

  function handleSelect(event) {
    event.preventDefault()

    if (!selectedOption) {
      toast.error('Please choose your lucky draw card.')
      return
    }

    if (!groupId || !cycleId) {
      toast.error('Cycle information is missing.')
      return
    }

    selectDrawMutation.mutate(selectedOption, {
      onSuccess: () => {
        setSelectedOption('')
      },
    })
  }

  return (
    <Card
      title="Your lucky draw"
      description="A special moment where every member gets an equal chance to receive their payout position."
    >
      <div className="space-y-7">

        {/* Introduction */}
        <div className="relative isolate overflow-hidden rounded-2xl border border-border bg-surface-secondary p-5 transition-colors duration-300 sm:p-7">

          {/* Subtle decorative background */}
          <div className="pointer-events-none absolute -right-12 -top-12 -z-10 h-48 w-48 rounded-full bg-brand-600/10 blur-3xl" />

          <div className="space-y-6">

            <div className="inline-flex items-center gap-2 rounded-full border border-brand-600/25 bg-surface px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-600" />
              <span className="text-xs font-semibold tracking-wider text-brand-600">
                THE MERIGO LUCKY DRAW
              </span>
            </div>

            <div className="max-w-2xl">
              <h3 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">
                A little choice.
                <br />
                A surprise waiting for you.
              </h3>

              <p className="mt-3 max-w-xl text-sm leading-7 text-text-muted sm:text-base">
                Every member gets one chance to choose a mystery card.
                Behind each card is a randomly assigned payout position.
                No numbers, no rankings and no hints. Simply choose the
                design that catches your eye!
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 border-t border-border pt-5 sm:grid-cols-3">

              <div className="rounded-xl p-3 transition-colors duration-200 hover:bg-surface">
                <p className="text-sm font-semibold text-text">
                  Equal opportunity
                </p>
                <p className="mt-1 text-xs leading-6 text-text-muted">
                  Every available card has an equal chance.
                </p>
              </div>

              <div className="rounded-xl p-3 transition-colors duration-200 hover:bg-surface">
                <p className="text-sm font-semibold text-text">
                  Mystery selection
                </p>
                <p className="mt-1 text-xs leading-6 text-text-muted">
                  Card designs do not reveal payout positions.
                </p>
              </div>

              <div className="rounded-xl p-3 transition-colors duration-200 hover:bg-surface">
                <p className="text-sm font-semibold text-text">
                  One selection
                </p>
                <p className="mt-1 text-xs leading-6 text-text-muted">
                  Each member can select only once.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Draw status */}
        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Draw status
            </p>

            <div className="mt-2 flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  drawComplete ? 'bg-green-500' : 'bg-amber-500'
                }`}
              />

              <p className="font-semibold text-text">
                {drawComplete ? 'Completed' : 'In progress'}
              </p>
            </div>
          </div>

          {!drawComplete && (
            <div className="rounded-xl border border-border bg-surface-secondary px-5 py-3 text-center">
              <p className="text-xs text-text-muted">
                Cards remaining
              </p>

              <p className="mt-1 text-2xl font-bold text-text">
                {remainingOptions}
              </p>
            </div>
          )}
        </div>

        {/* Completed state */}
        {drawComplete ? (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-6 transition-colors duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
                <span className="text-xl font-semibold text-green-600 dark:text-green-400">
                  ✓
                </span>
              </div>

              <div>
                <p className="font-semibold text-text">
                  The lucky draw is complete!
                </p>

                <p className="mt-2 text-sm leading-7 text-text-muted">
                  {isAdmin
                    ? 'All members have made their selections. This is your space to monitor the payout order, manage position-swap requests, and finalize the order once the swap deadline has passed.'
                    : 'All members have made their selections. The payout order is now available for the administrator to manage.'}
                </p>
              </div>
            </div>
          </div>

        ) : hasSelected ? (

          /* Already selected */
          <div className="rounded-2xl border border-brand-600/25 bg-brand-600/5 p-6 transition-colors duration-300">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-600/25 bg-brand-600/10">
                <span className="text-xl font-semibold text-brand-600">
                  ✓
                </span>
              </div>

              <div>
                <p className="font-semibold text-text">
                  Your choice has been recorded!
                </p>

                <p className="mt-2 text-sm leading-7 text-text-muted">
                  Your selection is safely recorded. Your assigned
                  payout position will be revealed when all members
                  have completed their selections.
                </p>
              </div>
            </div>
          </div>

        ) : options.length === 0 ? (

          /* No available cards */
          <div className="rounded-2xl border border-border bg-surface-secondary p-6 text-center">
            <p className="font-semibold text-text">
              No mystery cards are currently available.
            </p>

            <p className="mt-2 text-sm text-text-muted">
              Please check again later.
            </p>
          </div>

        ) : (

          /* Lucky draw cards */
          <>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-bold text-text">
                Choose the design you love
              </h3>

              <p className="mx-auto max-w-lg text-sm leading-7 text-text-muted">
                Take a moment, trust your instinct and select one
                mystery card. Every design is equally special.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

              {shuffledOptions.map((token, index) => {
                const isSelected = selectedOption === token

                const design = DRAW_SYMBOLS[
                  index % DRAW_SYMBOLS.length
                ]

                return (
                  <button
                    key={token}
                    type="button"
                    disabled={
                      !isDraft ||
                      selectDrawMutation.isPending
                    }
                    aria-pressed={isSelected}
                    aria-label={
                      isSelected
                        ? 'Selected mystery card'
                        : 'Choose this mystery card'
                    }
                    onClick={() => setSelectedOption(token)}
                    className={`
                      group relative overflow-hidden rounded-2xl
                      border p-3 text-left
                      transition-all duration-300 ease-out
                      focus:outline-none focus-visible:ring-2
                      focus-visible:ring-brand-600
                      focus-visible:ring-offset-2
                      focus-visible:ring-offset-surface
                      motion-reduce:transition-none
                      ${
                        isSelected
                          ? 'border-brand-600 bg-brand-600/5 shadow-lg ring-2 ring-brand-600/20'
                          : 'border-border bg-surface shadow-sm hover:-translate-y-1.5 hover:border-brand-600/50 hover:shadow-lg'
                      }
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                      disabled:hover:translate-y-0
                    `}
                  >

                    {/* Mystery card artwork */}
                    <div className="relative flex min-h-[190px] flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-surface-secondary transition-colors duration-300">

                      <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full border border-brand-600/15 transition-transform duration-500 group-hover:scale-110" />

                      <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full border border-brand-600/15 transition-transform duration-500 group-hover:scale-110" />

                      <div className="pointer-events-none absolute left-5 top-5 h-2 w-2 rounded-full bg-brand-600/40" />

                      <div className="pointer-events-none absolute bottom-7 right-7 h-3 w-3 rounded-full bg-brand-600/30" />

                      <div
                        className={`
                          relative flex h-24 w-24 items-center justify-center
                          rounded-full border border-brand-600/20
                          bg-surface shadow-sm
                          transition-all duration-500
                          group-hover:scale-110 group-hover:rotate-6
                          ${
                            isSelected
                              ? 'scale-110 rotate-6 border-brand-600/50 shadow-md'
                              : ''
                          }
                        `}
                      >
                        <span
                          className={`text-5xl transition-transform duration-500 group-hover:scale-110 ${design.style}`}
                        >
                          {design.symbol}
                        </span>
                      </div>

                      <p className="relative mt-5 text-xs font-bold tracking-[0.2em] text-brand-600">
                        A MYSTERY AWAITS
                      </p>
                    </div>

                    {/* Selection indicator */}
                    <div className="flex items-center justify-between px-2 py-4">

                      <div>
                        <p className="text-sm font-semibold text-text">
                          {isSelected ? 'Your chosen card' : 'Mystery card'}
                        </p>

                        <p className="mt-1 text-xs text-text-muted">
                          {isSelected
                            ? 'Ready for confirmation'
                            : 'Choose to reveal later'}
                        </p>
                      </div>

                      <span
                        className={`
                          flex h-7 w-7 items-center justify-center
                          rounded-full border text-sm font-semibold
                          transition-all duration-300
                          ${
                            isSelected
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-border bg-surface text-transparent group-hover:border-brand-600/60'
                          }
                        `}
                      >
                        ✓
                      </span>
                    </div>
                  </button>
                )
              })}

            </div>

            {/* Selection confirmation */}
            {isDraft && (
              <form
                onSubmit={handleSelect}
                className="rounded-2xl border border-brand-600/25 bg-brand-600/5 p-5 transition-colors duration-300 sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>
                    <p className="font-semibold text-text">
                      {selectedOption
                        ? 'Your mystery card is selected!'
                        : 'Waiting for your choice'}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-text-muted">
                      {selectedOption
                        ? 'Confirm your selection when you are ready.'
                        : 'Select one of the cards above to continue.'}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={
                      !selectedOption ||
                      selectDrawMutation.isPending
                    }
                  >
                    {selectDrawMutation.isPending
                      ? 'Saving selection...'
                      : 'Confirm my choice'}
                  </Button>

                </div>
              </form>
            )}
          </>
        )}

        {/* Draft restriction */}
        {!isDraft && !drawComplete && !hasSelected && (
          <p className="rounded-xl border border-border bg-surface-secondary p-4 text-sm leading-6 text-text-muted">
            Draw selections are closed because this cycle is no longer
            in draft status.
          </p>
        )}

        {/* Admin information */}
        {isAdmin && (
          <div className="border-t border-border pt-5">
            <p className="text-xs leading-6 text-text-muted">
              Administrator information: You can finalize the payout
              order after all members have made their selections and
              the swap deadline has passed.
            </p>
          </div>
        )}

      </div>
    </Card>
  )
}
