import { useNavigate, Link } from 'react-router-dom'

import Card from '../components/Card.jsx'
import Button from '../components/Button.jsx'
import { useCreateGroup } from '../hooks/useGroups.js'
import GroupForm from '../components/GroupForm.jsx'

export default function CreateGroupPage() {
  const navigate = useNavigate()
  const createGroupMutation = useCreateGroup()

  function handleCreateGroup(groupData) {
    createGroupMutation.mutate(groupData, {
      onSuccess: (createdGroup) => {
        navigate(`/groups/${createdGroup.id}`)
      },
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          to="/dashboard"
          className="text-sm font-semibold text-text-muted transition hover:text-text"
        >
          Back to dashboard
        </Link>

        <h1 className="mt-3 text-2xl font-bold text-text sm:text-3xl">
          Create a savings group
        </h1>

        <p className="mt-2 text-sm leading-6 text-text-muted">
          Create your savings community and establish the contribution
          arrangements for your members.
        </p>
      </div>

      <Card
        title="Group information"
        description="Provide the details of the savings group you want to establish."
      >
        <GroupForm
          onSubmit={handleCreateGroup}
          onCancel={() => navigate('/dashboard')}
          isPending={createGroupMutation.isPending}
          submitLabel="Create group"
          pendingLabel="Creating group..."
          validateStartDate
        />
      </Card>

      <Card title="What happens after creation?">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-text-muted">
          <li>You automatically become the group administrator.</li>
          <li>Your group is initially created with draft status.</li>
          <li>
            You can manage membership and group arrangements from its workspace.
          </li>
          <li>
            Group cycles and payout schedules can be configured as the group
            progresses.
          </li>
        </ul>
      </Card>
    </div>
  )
}