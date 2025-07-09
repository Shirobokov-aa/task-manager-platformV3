import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { tasks, users, projects } from "@/lib/db/schema"
import { eq, desc, or, ilike, and } from "drizzle-orm"
import { sql } from "drizzle-orm"
import { TasksView } from "@/components/tasks-view"

interface TasksPageProps {
  searchParams: {
    search?: string
    status?: string
    priority?: string
    view?: string
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
    <TasksView
      tasks={userTasks}
      searchParams={searchParams}
    />
  )
}
