
import { useState } from 'react'

import Card from '../../../../../components/Card.jsx'
import Button from '../../../../../components/Button.jsx'

import {
  useGroupCycles,
  useCreateCycle,
  useUpdateCycle,
  useCycleDrawOptions,
  useCycleOrderDetails,
  useCycleSwapRequests,
  useCycleRounds,
  useMyCycleRound,
  useFinalizeCycleOrder,
  useCreateCycleRounds,
  useActivateCycle,
  useActivateNextRound,
} from '../../../../../hooks/useCycles.js'

import CycleCreation from './CycleCreation.jsx'
import CycleDraw from './CycleDraw.jsx'
import PositionSwaps from './PositionSwaps.jsx'
import PayoutOrder from './PayoutOrder.jsx'
import CycleRounds from './CycleRounds.jsx'
import MyRound from './MyRound.jsx'

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#452044] border-t-transparent" />

      <p className="text-sm text-text-muted">
        Loading cycle information...
      </p>
    </div>
  )
}

function ErrorState({ onRetry, isFetching }) {
  return (
    <Card
      title="Unable to load cycles"
      description="We could not retrieve the cycle information. Please try again."
    >
      <Button onClick={onRetry} disabled={isFetching}>
        {isFetching ? 'Trying again...' : 'Try again'}
      </Button>
    </Card>
  )
}

export default function CycleManagement({ groupId, group, isAdmin }) {
  const [selectedCycleId, setSelectedCycleId] = useState(null)
  const [editingCycleId, setEditingCycleId] = useState(null)

  // Load all cycles belonging to this group.
  const {
    data: cyclesData,
    isLoading: cyclesLoading,
    isError: cyclesError,
    refetch: refetchCycles,
    isFetching: cyclesFetching,
  } = useGroupCycles(groupId)

  const cycles = Array.isArray(cyclesData)
    ? cyclesData
    : []

  const selectedCycle =
    cycles.find(
      (cycle) => String(cycle.id) === String(selectedCycleId),
    ) || cycles[0] || null

  const cycleId = selectedCycle?.id

  // Find the cycle currently being edited.
  const editingCycle =
    cycles.find(
      (cycle) => String(cycle.id) === String(editingCycleId),
    ) || null

  // Cycle draw options.
  const {
    data: drawData,
    isLoading: drawLoading,
    refetch: refetchDraw,
  } = useCycleDrawOptions(groupId, cycleId)

  // Cycle order details.
  const {
    data: orderData,
    isLoading: orderLoading,
    refetch: refetchOrder,
  } = useCycleOrderDetails(groupId, cycleId)

  // Swap requests.
  const {
    data: swapsData,
    isLoading: swapsLoading,
    refetch: refetchSwaps,
  } = useCycleSwapRequests(groupId, cycleId)

  // Cycle rounds.
  const {
    data: roundsData,
    isLoading: roundsLoading,
    refetch: refetchRounds,
  } = useCycleRounds(groupId, cycleId)

  // The current member's assigned round.
  const {
    data: myRoundData,
    isLoading: myRoundLoading,
    refetch: refetchMyRound,
  } = useMyCycleRound(groupId, cycleId)

  // Cycle creation and editing mutations.
  const createCycleMutation = useCreateCycle(groupId)

  const updateCycleMutation = useUpdateCycle(
    groupId,
    editingCycleId,
  )

  // Other cycle mutations.
  const finalizeOrderMutation = useFinalizeCycleOrder(
    groupId,
    cycleId,
  )

  const createRoundsMutation = useCreateCycleRounds(
    groupId,
    cycleId,
  )

  const activateCycleMutation = useActivateCycle(
    groupId,
    cycleId,
  )

  const activateNextRoundMutation = useActivateNextRound(
    groupId,
    cycleId,
  )

  const swaps = Array.isArray(swapsData)
    ? swapsData
    : []

  const rounds = Array.isArray(roundsData)
    ? roundsData
    : []

  // MyRound has its own loading state.
  const isCycleLoading =
    Boolean(cycleId) &&
    (
      drawLoading ||
      orderLoading ||
      swapsLoading ||
      roundsLoading
    )

  async function refreshCycleData() {
    if (!cycleId) {
      await refetchCycles()
      return
    }

    await Promise.all([
      refetchCycles(),
      refetchDraw(),
      refetchOrder(),
      refetchSwaps(),
      refetchRounds(),
      refetchMyRound(),
    ])
  }

  // Create a new cycle.
  function handleCreateCycle(cycleData) {
    if (!isAdmin) return

    createCycleMutation.mutate(cycleData, {
      onSuccess: (response) => {
        if (response?.id) {
          setSelectedCycleId(response.id)
        }
      },
    })
  }

  // Select a draft cycle for editing.
  function handleEditCycle(cycle) {
    if (!isAdmin || cycle.status !== 'DRAFT') return

    setSelectedCycleId(cycle.id)
    setEditingCycleId(cycle.id)
  }

  // Save changes to the selected cycle.
  function handleUpdateCycle(cycleData) {
    if (
      !isAdmin ||
      !editingCycleId ||
      !editingCycle ||
      editingCycle.status !== 'DRAFT'
    ) {
      return
    }

    updateCycleMutation.mutate(cycleData, {
      onSuccess: (response) => {
        if (response?.id) {
          setSelectedCycleId(response.id)
        }

        setEditingCycleId(null)
      },
    })
  }

  // Cancel editing and return the form to creation mode.
  function handleCancelEdit() {
    setEditingCycleId(null)
  }

  function handleFinalizeOrder() {
    if (!isAdmin || !cycleId) return

    finalizeOrderMutation.mutate()
  }

  function handleCreateRounds() {
    if (!isAdmin || !cycleId) return

    createRoundsMutation.mutate()
  }

  function handleActivateCycle() {
    if (!isAdmin || !cycleId) return

    activateCycleMutation.mutate()
  }

  function handleActivateNextRound() {
    if (!isAdmin || !cycleId) return

    activateNextRoundMutation.mutate()
  }

  if (cyclesLoading) {
    return <LoadingState />
  }

  if (cyclesError) {
    return (
      <ErrorState
        onRetry={refetchCycles}
        isFetching={cyclesFetching}
      />
    )
  }

  const order = orderData || {}
  const draw = drawData || {}

  const orderStatus =
    order.order_status || selectedCycle?.order_status

  const cycleStatus = selectedCycle?.status

  const isDraft = cycleStatus === 'DRAFT'
  const isActive = cycleStatus === 'ACTIVE'
  const isCompleted = cycleStatus === 'COMPLETED'

  // The backend provides draw completion in both responses.
  const drawComplete =
    draw.draw_complete === true ||
    order.draw_complete === true

  const orderLocked = orderStatus === 'LOCKED'

  const hasRounds = rounds.length > 0

  const hasActiveRound = rounds.some(
    (round) => round.status === 'ACTIVE',
  )

  const hasUpcomingRound = rounds.some(
    (round) => round.status === 'UPCOMING',
  )

  const canFinalizeOrder =
    isAdmin &&
    isDraft &&
    drawComplete &&
    orderStatus === 'OPEN'

  const canCreateRounds =
    isAdmin &&
    isDraft &&
    orderLocked &&
    !hasRounds

  // Sort rounds by their actual round number.
  const firstRound = [...rounds].sort(
    (a, b) =>
      Number(a.round_number) - Number(b.round_number),
  )[0]

  const canActivateCycle =
    isAdmin &&
    isDraft &&
    orderLocked &&
    hasRounds &&
    firstRound?.status === 'UPCOMING'

  const canActivateNextRound =
    isAdmin &&
    isActive &&
    !hasActiveRound &&
    hasUpcomingRound

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text">
            Cycles and rounds
          </h2>

          <p className="mt-1 text-sm leading-6 text-text-muted">
            Manage savings cycles, member draw selections, payout order
            and scheduled rounds for {group?.name}.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={refreshCycleData}
        >
          Refresh information
        </Button>
      </section>

      {/* Reusable cycle creation and editing form. */}
      {isAdmin && (
        <CycleCreation
          cycle={editingCycle}
          onCreateCycle={handleCreateCycle}
          onUpdateCycle={handleUpdateCycle}
          onCancelEdit={handleCancelEdit}
          isCreating={createCycleMutation.isPending}
          isUpdating={updateCycleMutation.isPending}
          group={group}
        />
      )}

      {cycles.length === 0 ? (
        <Card
          title="No cycles created"
          description={
            isAdmin
              ? 'Create the first savings cycle for this group.'
              : 'The group administrator has not created a savings cycle yet.'
          }
        />
      ) : (
        <>
          <Card
            title="Available cycles"
            description="Select a cycle to view its draw, payout order and rounds. Administrators can edit draft cycles."
          >
            <div className="space-y-3">
              {cycles.map((cycle) => {
                const selected =
                  String(cycle.id) === String(selectedCycle?.id)

                const isEditing =
                  String(cycle.id) === String(editingCycleId)

                const canEdit =
                  isAdmin && cycle.status === 'DRAFT'

                return (
                  <div
                    key={cycle.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition ${
                      selected
                        ? 'border-[#452044] bg-[#452044]/10'
                        : 'border-border bg-surface'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCycleId(cycle.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block font-semibold text-text">
                        {cycle.name || `Cycle ${cycle.cycle_number}`}
                      </span>

                      <span className="mt-1 block text-xs text-text-muted">
                        {cycle.status}
                      </span>
                    </button>

                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleEditCycle(cycle)}
                        disabled={
                          createCycleMutation.isPending ||
                          updateCycleMutation.isPending
                        }
                        aria-label={`Edit ${cycle.name || `Cycle ${cycle.cycle_number}`}`}
                        title="Edit cycle"
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isEditing
                            ? 'border-[#452044] bg-[#452044] text-white'
                            : 'border-border text-text hover:bg-surface-secondary'
                        }`}
                      >
                        ✎
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {selectedCycle && (
            <>
              <Card
                title={
                  selectedCycle.name ||
                  `Cycle ${selectedCycle.cycle_number}`
                }
                description="Current cycle information and management actions."
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-text-muted">
                      Status
                    </p>

                    <p className="mt-1 font-semibold text-text">
                      {selectedCycle.status}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-text-muted">
                      Start date
                    </p>

                    <p className="mt-1 font-semibold text-text">
                      {selectedCycle.start_date || 'Not set'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-text-muted">
                      End date
                    </p>

                    <p className="mt-1 font-semibold text-text">
                      {selectedCycle.end_date || 'Not set'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-text-muted">
                      Order status
                    </p>

                    <p className="mt-1 font-semibold text-text">
                      {orderStatus || 'Not started'}
                    </p>
                  </div>
                </div>
              </Card>

              {isCycleLoading ? (
                <LoadingState />
              ) : (
                <>
                  {/* Draw and position swaps side by side on large screens. */}
                  <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                    <CycleDraw
                      groupId={groupId}
                      cycleId={cycleId}
                      drawData={draw}
                      orderData={order}
                      isAdmin={isAdmin}
                      isDraft={isDraft}
                    />

                    <PositionSwaps
                      groupId={groupId}
                      cycleId={cycleId}
                      swaps={swaps}
                      orderData={order}
                      isLoading={swapsLoading}
                      isAdmin={isAdmin}
                      isDraft={isDraft}
                      onRefresh={refetchSwaps}
                    />
                  </div>

                  {/* Payout order remains full width. */}
                  <PayoutOrder
                    orderData={order}
                    isAdmin={isAdmin}
                    isDraft={isDraft}
                    canFinalizeOrder={canFinalizeOrder}
                    isFinalizing={finalizeOrderMutation.isPending}
                    onFinalize={handleFinalizeOrder}
                  />

                  {isAdmin && (
                    <Card
                      title="Cycle setup"
                      description="Complete the required steps before activating this cycle."
                    >
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-text">
                              Create payout rounds
                            </p>

                            <p className="text-sm text-text-muted">
                              Generate one scheduled round for each member in the finalized payout order.
                            </p>
                          </div>

                          <Button
                            type="button"
                            onClick={handleCreateRounds}
                            disabled={
                              !canCreateRounds ||
                              createRoundsMutation.isPending
                            }
                          >
                            {createRoundsMutation.isPending
                              ? 'Creating rounds...'
                              : 'Create rounds'}
                          </Button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                          <div>
                            <p className="font-medium text-text">
                              Activate cycle
                            </p>

                            <p className="text-sm text-text-muted">
                              Activate the cycle after its payout order and rounds are ready.
                            </p>
                          </div>

                          <Button
                            type="button"
                            onClick={handleActivateCycle}
                            disabled={
                              !canActivateCycle ||
                              activateCycleMutation.isPending
                            }
                          >
                            {activateCycleMutation.isPending
                              ? 'Activating...'
                              : 'Activate cycle'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )}

                  <CycleRounds
                    cycleId={selectedCycle?.id}
                    rounds={rounds}
                    isLoading={roundsLoading}
                    isAdmin={isAdmin}
                    cycleStatus={cycleStatus}
                    onActivateNextRound={handleActivateNextRound}
                    canActivateNextRound={canActivateNextRound}
                    isActivatingNextRound={
                      activateNextRoundMutation.isPending
                    }
                  />

                  <MyRound
                    myRound={myRoundData}
                    isLoading={myRoundLoading}
                  />
                </>
              )}

              {isCompleted && (
                <Card
                  title="Cycle completed"
                  description="All rounds in this savings cycle have been completed."
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
