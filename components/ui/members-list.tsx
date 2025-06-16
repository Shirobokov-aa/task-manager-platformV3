"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Crown, Eye, User } from "lucide-react"
import { removeMemberFromProject, changeMemberRole } from "@/app/actions/projects"
import { toast } from "sonner"

interface Member {
  id: string
  role: string
  addedAt: Date | null
  user: {
    id: string
    name: string
    email: string
    department: string | null
    role: string
  }
}

interface MembersListProps {
  members: Member[]
  projectId: string
  currentUserId: string
  isOwner: boolean
}

const roleIcons = {
  project_manager: Crown,
  executor: User,
  observer: Eye,
}

const roleLabels = {
  project_manager: "Руководитель",
  executor: "Исполнитель",
  observer: "Наблюдатель",
}

const roleColors = {
  project_manager: "bg-purple-100 text-purple-800",
  executor: "bg-blue-100 text-blue-800",
  observer: "bg-gray-100 text-gray-800",
}

export function MembersList({ members, projectId, currentUserId, isOwner }: MembersListProps) {
  async function handleRemoveMember(memberId: string, userName: string) {
    if (!confirm(`Удалить ${userName} из проекта?`)) return

    try {
      await removeMemberFromProject(projectId, memberId)
      toast.success("Участник удален из проекта")
    } catch (error) {
      toast.error("Ошибка удаления участника")
    }
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    try {
      await changeMemberRole(projectId, memberId, newRole)
      toast.success("Роль участника изменена")
    } catch (error) {
      toast.error("Ошибка изменения роли")
    }
  }

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const RoleIcon = roleIcons[member.role as keyof typeof roleIcons] || User
        const canManage = isOwner && member.user.id !== currentUserId

        return (
          <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{member.user.name}</span>
                  {member.user.id === currentUserId && (
                    <Badge variant="outline" className="text-xs">
                      Вы
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">{member.user.email}</p>
                {member.user.department && <p className="text-xs text-gray-500">{member.user.department}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge className={roleColors[member.role as keyof typeof roleColors]}>
                <RoleIcon className="w-3 h-3 mr-1" />
                {roleLabels[member.role as keyof typeof roleLabels]}
              </Badge>

              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleChangeRole(member.id, "project_manager")}>
                      Сделать руководителем
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeRole(member.id, "executor")}>
                      Сделать исполнителем
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeRole(member.id, "observer")}>
                      Сделать наблюдателем
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => handleRemoveMember(member.id, member.user.name)}
                    >
                      Удалить из проекта
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
