import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { users, tasks, projectMembers } from "@/lib/db/schema"
import { eq, count, desc, and, sql } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, Shield, Crown, User } from "lucide-react"
import { CreateUserForm } from "@/components/forms/create-user-form"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { UsersSearch } from "@/components/ui/users-search"



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
    createdAt: u.createdAt?.toISOString() || null, // Преобразуем Date в string для клиентского компонента
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

      {/* Поиск и список пользователей */}
      <UsersSearch users={usersWithStats} />
    </div>
  )
}
