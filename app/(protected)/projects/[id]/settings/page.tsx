import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { projects, users, projectMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Settings, Users, Trash2 } from "lucide-react"
import { notFound } from "next/navigation"
import { ProjectSettingsForm } from "@/components/forms/project-settings-form"
import { AddMemberForm } from "@/components/forms/add-member-form"
import { MembersList } from "@/components/ui/members-list"

interface ProjectSettingsPageProps {
  params: { id: string }
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Получаем проект
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      ownerId: projects.ownerId,
      createdAt: projects.createdAt,
      owner: {
        name: users.name,
        email: users.email,
      },
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(eq(projects.id, params.id))
    .limit(1)

  if (!project) {
    notFound()
  }

  // Проверяем права доступа
  const canManage = project.ownerId === user.id || user.role === "admin"
  if (!canManage) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Доступ запрещен</h3>
        <p className="text-gray-600">У вас нет прав для управления настройками этого проекта</p>
      </div>
    )
  }

  // Получаем участников проекта
  const members = await db
    .select({
      id: projectMembers.id,
      role: projectMembers.role,
      addedAt: projectMembers.addedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        department: users.department,
        role: users.role,
      },
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, params.id))

  // Получаем всех пользователей для добавления
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      department: users.department,
      role: users.role,
    })
    .from(users)

  // Фильтруем пользователей, которые еще не участники
  const availableUsers = allUsers.filter((u) => !members.some((m) => m.user.id === u.id))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-gray-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Настройки проекта</h1>
          <p className="text-gray-600">{project.title}</p>
        </div>
      </div>

      {/* Основные настройки проекта */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Основная информация
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectSettingsForm project={project} />
        </CardContent>
      </Card>

      {/* Управление участниками */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Участники проекта ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Добавление нового участника */}
          <div>
            <h3 className="text-lg font-medium mb-4">Добавить участника</h3>
            <AddMemberForm projectId={params.id} availableUsers={availableUsers} />
          </div>

          <Separator />

          {/* Список участников */}
          <div>
            <h3 className="text-lg font-medium mb-4">Текущие участники</h3>
            <MembersList
              members={members}
              projectId={params.id}
              currentUserId={user.id}
              isOwner={project.ownerId === user.id}
            />
          </div>
        </CardContent>
      </Card>

      {/* Опасная зона */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Опасная зона
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <h4 className="font-medium text-red-800 mb-2">Удалить проект</h4>
            <p className="text-sm text-red-700 mb-4">
              Это действие нельзя отменить. Все задачи, комментарии и файлы будут удалены навсегда.
            </p>
            <Button variant="destructive" size="sm">
              Удалить проект
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
