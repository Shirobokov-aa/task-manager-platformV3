import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { users, tasks, projectMembers } from "@/lib/db/schema"
import { eq, count, desc, and, sql } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, UserPlus, Search, Shield, Crown, User, Eye } from "lucide-react"
import { CreateUserForm } from "@/components/forms/create-user-form"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

const roleIcons = {
  admin: Shield,
  project_manager: Crown,
  executor: User,
  observer: Eye,
}

const roleLabels = {
  admin: "Администратор",
  project_manager: "Руководитель проекта",
  executor: "Исполнитель",
  observer: "Наблюдатель",
}

const roleColors = {
  admin: "bg-red-100 text-red-800",
  project_manager: "bg-purple-100 text-purple-800",
  executor: "bg-blue-100 text-blue-800",
  observer: "bg-gray-100 text-gray-800",
}

interface CountResult {
  count: number
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Проверяем права доступа
  if (user.role !== "admin" && user.role !== "project_manager") {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Доступ запрещен</h3>
        <p className="text-gray-600">У вас нет прав для просмотра списка пользователей</p>
      </div>
    )
  }

  // Получаем всех пользователей с статистикой
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      department: users.department,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))

  // Получаем статистику для всех пользователей одним запросом
  const [projectStats, taskStats, completedTaskStats] = await Promise.all([
    // Количество проектов для каждого пользователя
    db
      .select({
        userId: projectMembers.userId,
        count: count().as("count"),
      })
      .from(projectMembers)
      .groupBy(projectMembers.userId),

    // Общее количество задач для каждого пользователя
    db
      .select({
        assigneeId: tasks.assigneeId,
        count: count().as("count"),
      })
      .from(tasks)
      .where(
        and(
          sql`${tasks.assigneeId} IS NOT NULL`
        )
      )
      .groupBy(tasks.assigneeId),

    // Количество завершенных задач для каждого пользователя
    db
      .select({
        assigneeId: tasks.assigneeId,
        count: count().as("count"),
      })
      .from(tasks)
      .where(
        and(
          sql`${tasks.assigneeId} IS NOT NULL`,
          eq(tasks.status, "completed")
        )
      )
      .groupBy(tasks.assigneeId),
  ])

  // Преобразуем результаты в Map для быстрого доступа
  const projectStatsMap = new Map(projectStats.map(stat => [stat.userId, stat.count]))
  const taskStatsMap = new Map(taskStats.map(stat => [stat.assigneeId, stat.count]))
  const completedTaskStatsMap = new Map(completedTaskStats.map(stat => [stat.assigneeId, stat.count]))

  // Объединяем данные пользователей со статистикой
  const usersWithStats = allUsers.map(u => ({
    ...u,
    stats: {
      projects: projectStatsMap.get(u.id) || 0,
      tasks: taskStatsMap.get(u.id) || 0,
      completedTasks: completedTaskStatsMap.get(u.id) || 0,
    },
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Пользователи</h1>
          <p className="text-gray-600 mt-2">Управление пользователями системы</p>
        </div>
        {user.role === "admin" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Добавить пользователя
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CreateUserForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Поиск и фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск пользователей</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input placeholder="Поиск по имени или email..." className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUsers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Администраторы</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{allUsers.filter((u) => u.role === "admin").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Руководители</CardTitle>
            <Crown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {allUsers.filter((u) => u.role === "project_manager").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Исполнители</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {allUsers.filter((u) => u.role === "executor").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Список пользователей */}
      <Card>
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {usersWithStats.map((u) => {
              const RoleIcon = roleIcons[u.role as keyof typeof roleIcons] || User

              return (
                <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="text-lg">{u.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{u.name}</h3>
                        <Badge className={roleColors[u.role as keyof typeof roleColors]}>
                          <RoleIcon className="w-3 h-3 mr-1" />
                          {roleLabels[u.role as keyof typeof roleLabels]}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{u.email}</p>
                      {u.department && <p className="text-xs text-gray-500">{u.department}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="text-center">
                      <div className="font-medium">{u.stats.projects}</div>
                      <div className="text-xs">Проектов</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{u.stats.tasks}</div>
                      <div className="text-xs">Задач</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-green-600">{u.stats.completedTasks}</div>
                      <div className="text-xs">Завершено</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">{new Date(u.createdAt!).toLocaleDateString("ru-RU")}</div>
                      <div className="text-xs">Регистрация</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
