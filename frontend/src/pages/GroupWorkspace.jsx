
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { getCurrentUser } from '../api/authApi.js'

import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'

import {
  useGroup,
  useGroupMembers,
  usePendingGroupMembers,
  useMyGroupMembershipHistory,
  useRequestToJoinGroup,
  useCancelGroupJoinRequest,
  useApproveGroupMember,
  useRejectGroupMember,
  useUpdateGroup,
  useDeleteGroup,
} from '../hooks/useGroups.js'

import MemberCard from './groups/workspace/components/MemberCard.jsx'
import PendingMemberCard from './groups/workspace/components/PendingMemberCard.jsx'
import GroupHeader from './groups/workspace/components/GroupHeader.jsx'
import GroupNavigation from './groups/workspace/components/GroupNavigation.jsx'
import GroupOverview from './groups/workspace/components/GroupOverview.jsx'
import GroupMembers from './groups/workspace/components/GroupMembers.jsx'
import CycleManagement from './groups/workspace/components/cycles/CycleManagement.jsx'

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'contributions', label: 'Contributions' },
  { id: 'payments', label: 'Payments' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'cycles', label: 'Cycles and rounds' },
  { id: 'activity', label: 'Activity' },
]

const sectionDescriptions = {
  members: {
    title: 'Group members',
    description:
      'View active member profiles and their assigned group roles.',
  },
  contributions: {
    title: 'Contributions',
    description:
      'View contribution records, amounts due, payments made and outstanding balances.',
  },
  payments: {
    title: 'Payment history',
    description:
      'View your M-Pesa payment records, transaction references and payment statuses.',
  },
  payouts: {
    title: 'Payout schedule',
    description:
      'View payout recipients, expected amounts and payout transaction statuses.',
  },
  cycles: {
    title: 'Cycles and rounds',
    description:
      'View savings cycles, round schedules, payout order and cycle progress.',
  },
  activity: {
    title: 'Group activity',
    description:
      'View important membership, contribution, cycle and payout activities.',
  },
}

function LoadingState() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#452044] border-t-transparent" />
      <p className="text-sm text-text-muted">
        Loading group information...
      </p>
    </div>
  )
}

function MembersLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#452044] border-t-transparent" />
      <p className="text-sm text-text-muted">
        Loading group members...
      </p>
    </div>
  )
}

export default function GroupWorkspace() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeSection, setActiveSection] = useState('overview')
  const [checkingProfile, setCheckingProfile] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadCurrentUser() {
      try {
        const user = await getCurrentUser()

        if (isMounted) {
          setCurrentUser(user)
        }
      } catch {
        // Keep the workspace available if the greeting cannot be loaded.
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  const {
    data: group,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGroup(id)

  const membershipStatus = group?.user_membership_status
  const membershipRole = group?.user_membership_role

  const isMember = ['ACTIVE', 'LEAVE_REQUESTED'].includes(
    membershipStatus,
  )

  const isAdmin =
    membershipStatus === 'ACTIVE' && membershipRole === 'ADMIN'

  const canManageDraftGroup = isAdmin && group?.status === 'DRAFT'

  const canViewMemberDirectory = membershipStatus === 'ACTIVE'

  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
    error: membersErrorDetails,
    refetch: refetchMembers,
    isFetching: membersFetching,
  } = useGroupMembers(id, canViewMemberDirectory)

  const {
    data: pendingMembers,
    isLoading: pendingMembersLoading,
    isError: pendingMembersError,
    error: pendingMembersErrorDetails,
    refetch: refetchPendingMembers,
    isFetching: pendingMembersFetching,
  } = usePendingGroupMembers(id, isAdmin)

  const {
    data: membershipHistory,
    isLoading: membershipHistoryLoading,
  } = useMyGroupMembershipHistory(id)

  const requestJoinMutation = useRequestToJoinGroup(id)
  const cancelJoinMutation = useCancelGroupJoinRequest(id)
  const approveMemberMutation = useApproveGroupMember(id)
  const rejectMemberMutation = useRejectGroupMember(id)

  const updateGroupMutation = useUpdateGroup(id)
  const deleteGroupMutation = useDeleteGroup(id)

  const history = membershipHistory?.history || []

  const latestRejection = history.find(
    (item) => item.new_status === 'REJECTED',
  )

  async function handleRequestToJoin() {
    if (checkingProfile || requestJoinMutation.isPending) return

    setCheckingProfile(true)

    try {
      const currentUser = await getCurrentUser()

      if (currentUser.is_profile_complete !== true) {
        navigate('/complete-profile', {
          state: {
            from: {
              pathname: location.pathname,
              search: location.search,
              hash: location.hash,
            },
            action: {
              type: 'JOIN_GROUP',
              groupId: Number(id),
            },
          },
        })

        return
      }

      requestJoinMutation.mutate()
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          'Unable to verify your profile. Please try again.',
      )
    } finally {
      setCheckingProfile(false)
    }
  }

  function handleUpdateGroup(groupData) {
    if (!canManageDraftGroup) return

    updateGroupMutation.mutate(groupData, {
      onSuccess: () => {
        setShowEditForm(false)
      },
    })
  }

  function handleDeleteGroup() {
    if (!canManageDraftGroup || deleteGroupMutation.isPending) return

    deleteGroupMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/dashboard')
      },
    })
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (isError) {
    const isNotFound = error.response?.status === 404

    return (
      <Card
        title={isNotFound ? 'Group not found' : 'Unable to load group'}
        description={
          isNotFound
            ? 'This group does not exist or is no longer available.'
            : 'We could not retrieve this group. Please try again.'
        }
      >
        <div className="flex flex-wrap gap-3">
          {!isNotFound && (
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? 'Trying again...' : 'Try again'}
            </Button>
          )}

          <Link
            to="/dashboard"
            className="inline-flex items-center rounded-lg border border-border px-4 py-2 font-medium text-text transition hover:bg-surface-secondary"
          >
            Back to dashboard
          </Link>
        </div>
      </Card>
    )
  }

  if (!group) return null

  const isPending = membershipStatus === 'PENDING'
  const isRejected = membershipStatus === 'REJECTED'
  const isActiveGroup = group.status === 'ACTIVE'

  const canRequestMembership =
    !membershipStatus ||
    ['LEFT', 'REMOVED', 'CANCELLED', 'REJECTED'].includes(
      membershipStatus,
    )

  const visibleSections = isMember
    ? sections
    : sections.filter((section) => section.id === 'overview')

  const currentSection = sections.find(
    (section) => section.id === activeSection,
  )

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex text-sm font-semibold text-text-muted underline-offset-4 transition hover:text-text hover:underline"
      >
        Back to member dashboard
      </Link>

      {currentUser?.username && (
        <div>
          <p className="text-lg font-semibold text-text">
            Welcome, {currentUser.username}!
          </p>
        </div>
      )}

      <GroupHeader
        group={group}
        isAdmin={isAdmin}
        isMember={isMember}
        isPending={isPending}
        isRejected={isRejected}
        membershipStatus={membershipStatus}
        membershipRole={membershipRole}
      />

      <GroupNavigation
        visibleSections={visibleSections}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
      />

      {activeSection === 'overview' && (
        <GroupOverview
          group={group}
          membershipStatus={membershipStatus}
          membershipRole={membershipRole}
          isMember={isMember}
          isPending={isPending}
          isRejected={isRejected}
          membershipHistoryLoading={membershipHistoryLoading}
          latestRejection={latestRejection}
          cancelJoinMutation={cancelJoinMutation}
          checkingProfile={checkingProfile}
          requestJoinMutation={requestJoinMutation}
          isActiveGroup={isActiveGroup}
          handleRequestToJoin={handleRequestToJoin}
          canRequestMembership={canRequestMembership}
          isAdmin={isAdmin}
          setActiveSection={setActiveSection}
          canManageDraftGroup={canManageDraftGroup}
          showEditForm={showEditForm}
          setShowEditForm={setShowEditForm}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          handleUpdateGroup={handleUpdateGroup}
          updateGroupMutation={updateGroupMutation}
          handleDeleteGroup={handleDeleteGroup}
          deleteGroupMutation={deleteGroupMutation}
        />
      )}

      {isMember && activeSection === 'members' && (
        <GroupMembers
          isAdmin={isAdmin}
          pendingMembersLoading={pendingMembersLoading}
          pendingMembersError={pendingMembersError}
          pendingMembersErrorDetails={pendingMembersErrorDetails}
          pendingMembers={pendingMembers}
          pendingMembersFetching={pendingMembersFetching}
          refetchPendingMembers={refetchPendingMembers}
          approveMemberMutation={approveMemberMutation}
          rejectMemberMutation={rejectMemberMutation}
          canViewMemberDirectory={canViewMemberDirectory}
          membersLoading={membersLoading}
          membersError={membersError}
          membersErrorDetails={membersErrorDetails}
          membersFetching={membersFetching}
          members={members}
          refetchMembers={refetchMembers}
          MembersLoadingState={MembersLoadingState}
          PendingMemberCard={PendingMemberCard}
          MemberCard={MemberCard}
        />
      )}

      {isMember && activeSection === 'cycles' && (
        <CycleManagement
          groupId={id}
          group={group}
          isAdmin={isAdmin}
        />
      )}

      {isMember &&
        activeSection !== 'overview' &&
        activeSection !== 'members' &&
        activeSection !== 'cycles' &&
        currentSection && (
          <Card
            title={sectionDescriptions[activeSection].title}
            description={sectionDescriptions[activeSection].description}
          >
            <div className="rounded-xl border border-border bg-surface-secondary p-5">
              <p className="font-semibold text-text">
                {isAdmin ? 'Administrator access' : 'Member access'}
              </p>

              <p className="mt-2 text-sm leading-6 text-text-muted">
                {sectionDescriptions[activeSection].description}
              </p>

              <p className="mt-3 text-sm text-text-muted">
                This section is ready for its live backend data and actions.
                No sample financial or membership records are being displayed.
              </p>
            </div>
          </Card>
        )}

      <div className="flex flex-wrap gap-3">
        <Link
          to="/dashboard"
          className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-text transition hover:bg-surface"
        >
          Back to dashboard
        </Link>

        <Link
          to="/profile"
          className="rounded-lg border border-border px-5 py-3 text-sm font-semibold text-text transition hover:bg-surface"
        >
          My profile
        </Link>
      </div>
    </div>
  )
}
