"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { addProjectMember } from "@/app/actions/projects"
import { toast } from "sonner"
import { UserPlus } from "lucide-react"

interface AddMemberFormProps {
  projectId: string
  availableUsers: Array<{
    id: string
    name: string
    email: string
    department: string | null
    role: string
  }>
}

export function AddMemberForm({ projectId, availableUsers }: AddMemberFormProps) {
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedRole, setSelectedRole] = useState("executor")
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit() {
    if (!selectedUser) {
      toast.error("Выберите пользователя")
      return
    }

    setIsLoading(true)
    try {
      await addProjectMember(projectId, selectedUser, selectedRole)
      toast.success("Участник добавлен в проект")
      setSelectedUser("")
      setSelectedRole("executor")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка добавления участника")
    } finally {
      setIsLoading(false)
    }
  }

  if (availableUsers.length === 0) {
    return (
      <div className="text-center py-4 text-gray-600">
        <p>Все пользователи уже участвуют в проекте</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label>Пользователь</Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите пользователя" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Роль в проекте</Label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="project_manager">Руководитель проекта</SelectItem>
            <SelectItem value="executor">Исполнитель</SelectItem>
            <SelectItem value="observer">Наблюдатель</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        <Button onClick={handleSubmit} disabled={isLoading || !selectedUser} className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          {isLoading ? "Добавление..." : "Добавить"}
        </Button>
      </div>
    </div>
  )
}
