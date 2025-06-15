import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { projects, tasks, users, projectMembers } from "@/lib/db/schema"
import { eq, and, desc, count, sql } from "drizzle-orm"
import { ProjectCard } from "@/components/ui/project-card"
import { TaskCard } from "@/components/ui/task-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckSquare, FolderOpen, Clock } from "lucide-react"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  // Получаем проекты пользователя с подсчетом задач и участников
  const userProjects = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      ownerId: projects.ownerId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      owner: {
        name: users.name,
        email: users.email,
      },
      _count: {
        members: sql<number>`(SELECT COUNT(*) FROM ${projectMembers} WHERE ${projectMembers.projectId} = ${projects.id})`.as('members_count'),
        tasks: sql<number>`(SELECT COUNT(*) FROM ${tasks} WHERE ${tasks.projectId} = ${projects.id})`.as('tasks_count'),
        completedTasks: sql<number>`(SELECT COUNT(*) FROM ${tasks} WHERE ${tasks.projectId} = ${projects.id} AND ${tasks.status} = 'completed')`.as('completed_tasks_count'),
      },
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, session.user.id))
    .orderBy(desc(projects.updatedAt))
    .limit(6)

  // Получаем задачи пользователя
  const userTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      complexity: tasks.complexity,
      dueDate: tasks.dueDate,
      tags: tasks.tags,
      assignee: {
        name: users.name,
        email: users.email,
      },
      project: {
        id: projects.id,
        title: projects.title,
      },
      _count: {
        subtasks: sql<number>`(SELECT COUNT(*) FROM ${tasks} as t WHERE t.parent_task_id = ${tasks.id})`.as('subtasks_count'),
        comments: sql<number>`(SELECT COUNT(*) FROM comments WHERE comments.task_id = ${tasks.id})`.as('comments_count'),
      },
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.assigneeId, session.user.id))
    .orderBy(desc(tasks.updatedAt))
    .limit(5)

  // Статистика
  const [{ total: totalTasks }] = await db
    .select({ total: count() })
    .from(tasks)
    .where(eq(tasks.assigneeId, session.user.id))

  const [{ total: completedTasks }] = await db
    .select({ total: count() })
    .from(tasks)
    .where(and(eq(tasks.assigneeId, session.user.id), eq(tasks.status, "completed")))

  const [{ total: overdueTasks }] = await db
    .select({ total: count() })
    .from(tasks)
    .where(
      and(
        eq(tasks.assigneeId, session.user.id),
        eq(tasks.status, "open"),
        sql<boolean>`${tasks.dueDate} < NOW()`
      )
    )

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Выполнено задач</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Просроченные задачи</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueTasks}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Последние проекты</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Мои задачи</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  )
}
