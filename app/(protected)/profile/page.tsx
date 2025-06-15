import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { tasks, users, projects, projectMembers } from "@/lib/db/schema"
import { eq, and, count, desc, or } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { TaskCard } from "@/components/ui/task-card"
import { CheckSquare, FolderOpen, Clock, User } from "lucide-react"

interface Task {
  id: string
  title: string
  description: string | null
  projectId: string
  parentTaskId: string | null
  assigneeId: string | null
  creatorId: string
  status: string
  priority: string
  complexity: number
  dueDate: Date | null
  tags: string[] | null
  createdAt: Date | null
  updatedAt: Date | null
  assignee: {
    name: string
    email: string
  } | null
  creator: {
    name: string
    email: string
  }
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Получаем полную информацию о пользователе
  const [userInfo] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)

  // Статистика пользователя
  const stats = await Promise.all([
    // Всего задач
    db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.assigneeId, user.id)),
    // Завершенные задачи
    db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, user.id), eq(tasks.status, "completed"))),
    // Активные задачи
    db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, user.id), eq(tasks.status, "open"))),
    // Проекты
    db
      .select({ count: count() })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, user.id)),
  ])

  const [totalTasks, completedTasks, activeTasks, totalProjects] = stats.map((s) => s[0].count)

  // Последние задачи пользователя
  const tasksWithoutCreator = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      projectId: tasks.projectId,
      parentTaskId: tasks.parentTaskId,
      assigneeId: tasks.assigneeId,
      creatorId: tasks.creatorId,
      status: tasks.status,
      priority: tasks.priority,
      complexity: tasks.complexity,
      dueDate: tasks.dueDate,
      tags: tasks.tags,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      assignee: {
        name: users.name,
        email: users.email,
      },
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.assigneeId, user.id))
    .orderBy(desc(tasks.updatedAt))
    .limit(6)

  // Получаем информацию о создателях
  const creators = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(
      or(...tasksWithoutCreator.map((task) => eq(users.id, task.creatorId)))
    )

  // Объединяем данные
  const recentTasks = tasksWithoutCreator.map((task) => ({
    ...task,
    creator: creators.find((creator) => creator.id === task.creatorId),
  })) as Task[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Профиль пользователя</h1>
        <p className="text-gray-600 mt-2">Информация о вашем аккаунте и активности</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Информация о пользователе */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Личная информация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-2xl">{userInfo.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{userInfo.name}</h3>
                <p className="text-gray-600">{userInfo.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Роль</label>
                <div className="mt-1">
                  <Badge variant="outline">{userInfo.role}</Badge>
                </div>
              </div>

              {userInfo.department && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Отдел</label>
                  <p className="mt-1">{userInfo.department}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600">Дата регистрации</label>
                <p className="mt-1">{new Date(userInfo.createdAt!).toLocaleDateString("ru-RU")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Статистика */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Всего задач</CardTitle>
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTasks}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Завершено</CardTitle>
                <CheckSquare className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{completedTasks}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Активные</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{activeTasks}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Проекты</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProjects}</div>
              </CardContent>
            </Card>
          </div>

          {/* Последние задачи */}
          <Card>
            <CardHeader>
              <CardTitle>Последние задачи</CardTitle>
            </CardHeader>
            <CardContent>
              {recentTasks.length === 0 ? (
                <p className="text-gray-600 text-center py-4">У вас пока нет задач</p>
              ) : (
                <div className="grid gap-4">
                  {recentTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
