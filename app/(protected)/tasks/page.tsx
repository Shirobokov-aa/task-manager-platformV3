import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { tasks, users, projects } from "@/lib/db/schema"
import { eq, desc, or, ilike, and } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { TaskCard } from "@/components/ui/task-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

interface TasksPageProps {
  searchParams: {
    search?: string
    status?: string
    priority?: string
  }
}

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
  project: {
    title: string
  }
  assignee: {
    name: string
    email: string
  } | null
  creator: {
    name: string
    email: string
  }
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Строим запрос с фильтрами
  const query = db
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
      project: {
        title: projects.title,
      },
      assignee: {
        name: users.name,
        email: users.email,
      },
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))

  // Применяем фильтры
  const conditions = []

  // Показываем только задачи пользователя (назначенные или созданные)
  conditions.push(or(eq(tasks.assigneeId, user.id), eq(tasks.creatorId, user.id)))

  if (searchParams.search) {
    conditions.push(ilike(tasks.title, `%${searchParams.search}%`))
  }

  if (searchParams.status) {
    conditions.push(eq(tasks.status, searchParams.status))
  }

  if (searchParams.priority) {
    conditions.push(eq(tasks.priority, searchParams.priority))
  }

  const tasksWithoutCreator = await query
    .where(conditions.length === 1 ? conditions[0] : conditions.reduce((acc, condition) => and(acc, condition)))
    .orderBy(desc(tasks.createdAt))

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
  const userTasks = tasksWithoutCreator.map((task) => ({
    ...task,
    creator: creators.find((creator) => creator.id === task.creatorId),
  })) as Task[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Мои задачи</h1>
        <p className="text-gray-600 mt-2">Управляйте своими задачами и отслеживайте прогресс</p>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск и фильтры</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Поиск по названию..."
                className="pl-10"
                defaultValue={searchParams.search}
                name="search"
              />
            </div>
            <Select defaultValue={searchParams.status}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="open">Открыта</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="completed">Завершена</SelectItem>
                <SelectItem value="cancelled">Отменена</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue={searchParams.priority}>
              <SelectTrigger>
                <SelectValue placeholder="Приоритет" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все приоритеты</SelectItem>
                <SelectItem value="low">Низкий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="high">Высокий</SelectItem>
                <SelectItem value="critical">Критический</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Список задач */}
      {userTasks.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Задач не найдено</h3>
          <p className="text-gray-600">Попробуйте изменить фильтры или создать новую задачу</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
