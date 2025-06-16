import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { projects, tasks, users, projectMembers, auditLogs } from "@/lib/db/schema"
import { eq, count, desc, and, gte, sql } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingUp, Users, CheckSquare, Clock, AlertTriangle } from "lucide-react"
import { ExportButtons } from "@/components/ui/export-buttons"

export default async function ReportsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Проверяем права доступа
  if (user.role !== "admin" && user.role !== "project_manager") {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Доступ запрещен</h3>
        <p className="text-gray-600">У вас нет прав для просмотра отчетов</p>
      </div>
    )
  }

  // Общая статистика
  const [totalProjects, totalTasks, completedTasks, overdueTasks, totalUsers, activeUsers] = await Promise.all([
    db.select({ count: count() }).from(projects),
    db.select({ count: count() }).from(tasks),
    db.select({ count: count() }).from(tasks).where(eq(tasks.status, "completed")),
    db
      .select({ count: count() })
      .from(tasks)
      .where(and(eq(tasks.status, "open"), sql`${tasks.dueDate} < NOW()`)),
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, sql`NOW() - INTERVAL '30 days'`)),
  ])

  // Статистика по проектам
  const projectStats = await db
    .select({
      id: projects.id,
      title: projects.title,
      owner: users.name,
      totalTasks: count(tasks.id),
      completedTasks: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'completed' THEN 1 END)`,
      membersCount: sql<number>`(SELECT COUNT(*) FROM ${projectMembers} WHERE ${projectMembers.projectId} = ${projects.id})`,
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .leftJoin(tasks, eq(projects.id, tasks.projectId))
    .groupBy(projects.id, users.name)
    .orderBy(desc(sql`COUNT(${tasks.id})`))
    .limit(10)

  // Активность пользователей
  const userActivity = await db
    .select({
      user: users.name,
      totalTasks: count(tasks.id),
      completedTasks: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'completed' THEN 1 END)`,
      activeTasks: sql<number>`COUNT(CASE WHEN ${tasks.status} IN ('open', 'in_progress') THEN 1 END)`,
    })
    .from(users)
    .leftJoin(tasks, eq(users.id, tasks.assigneeId))
    .groupBy(users.id, users.name)
    .orderBy(desc(sql`COUNT(${tasks.id})`))
    .limit(10)

  // Последняя активность
  const recentActivity = await db
    .select({
      action: auditLogs.action,
      createdAt: auditLogs.createdAt,
      user: users.name,
      project: projects.title,
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(projects, eq(auditLogs.projectId, projects.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10)

  const completionRate = totalTasks[0].count > 0 ? Math.round((completedTasks[0].count / totalTasks[0].count) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-gray-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Отчеты и аналитика</h1>
            <p className="text-gray-600">Статистика по проектам и задачам</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportButtons type="projects" />
          <ExportButtons type="tasks" />
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Проекты</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects[0].count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего задач</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTasks[0].count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Завершено</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTasks[0].count}</div>
            <p className="text-xs text-muted-foreground">{completionRate}% от общего</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Просрочено</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTasks[0].count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Пользователи</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers[0].count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Новые за месяц</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeUsers[0].count}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Статистика по проектам */}
        <Card>
          <CardHeader>
            <CardTitle>Топ проектов по активности</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectStats.map((project) => {
                const completion =
                  project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0

                return (
                  <div key={project.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-gray-600">
                          {project.owner} • {project.membersCount} участников
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {project.completedTasks}/{project.totalTasks}
                        </p>
                        <p className="text-xs text-gray-600">{completion}%</p>
                      </div>
                    </div>
                    <Progress value={completion} className="h-2" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Активность пользователей */}
        <Card>
          <CardHeader>
            <CardTitle>Активность пользователей</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{activity.user}</p>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>Всего: {activity.totalTasks}</span>
                      <span className="text-green-600">Завершено: {activity.completedTasks}</span>
                      <span className="text-orange-600">Активных: {activity.activeTasks}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      {activity.totalTasks > 0 ? Math.round((activity.completedTasks / activity.totalTasks) * 100) : 0}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Последняя активность */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Последняя активность
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium">{activity.user}</p>
                  <p className="text-sm text-gray-600">
                    {activity.action} {activity.project && `в проекте "${activity.project}"`}
                  </p>
                </div>
                <p className="text-xs text-gray-500">{new Date(activity.createdAt!).toLocaleString("ru-RU")}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
