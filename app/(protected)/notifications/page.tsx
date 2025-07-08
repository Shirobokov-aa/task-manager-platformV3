import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { notifications, users, projects } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell, Clock, MessageSquare, User, FolderOpen, Calendar } from "lucide-react"
import Link from "next/link"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  entityType: string
  entityId: string
  projectId: string | null
  isRead: boolean
  createdAt: Date | null
  triggeredBy: {
    id: string
    name: string
  }
  project: {
    title: string
  } | null
}

const notificationIcons = {
  task_assigned: User,
  comment_added: MessageSquare,
  project_invite: FolderOpen,
  deadline_reminder: Calendar,
}

const notificationColors = {
  task_assigned: "text-blue-600",
  comment_added: "text-green-600",
  project_invite: "text-purple-600",
  deadline_reminder: "text-orange-600",
}

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Получаем все уведомления пользователя
  const userNotifications = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
      projectId: notifications.projectId,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      triggeredBy: {
        id: users.id,
        name: users.name,
      },
      project: {
        title: projects.title,
      },
    })
    .from(notifications)
    .innerJoin(users, eq(notifications.triggeredById, users.id))
    .leftJoin(projects, eq(notifications.projectId, projects.id))
    .where(eq(notifications.recipientId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100) as Notification[]

  const unreadCount = userNotifications.filter(n => !n.isRead).length

  const formatTime = (date: Date | null) => {
    if (!date) return ""

    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return "только что"
    if (minutes < 60) return `${minutes} мин назад`
    if (hours < 24) return `${hours} ч назад`
    if (days < 30) return `${days} дн назад`

    return new Date(date).toLocaleDateString("ru-RU")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Уведомления</h1>
          <p className="text-gray-600 mt-2">
            {unreadCount > 0 ? `${unreadCount} новых уведомлений` : "Все уведомления прочитаны"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="text-sm text-gray-600">{userNotifications.length} всего</span>
        </div>
      </div>

      {userNotifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Уведомлений нет</h3>
            <p className="text-gray-600">
              Когда у вас появятся новые уведомления, они будут отображаться здесь
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {userNotifications.map((notification) => {
            const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Bell
            const colorClass = notificationColors[notification.type as keyof typeof notificationColors] || "text-gray-600"

            // Определяем ссылку для перехода
            let href = ""
            switch (notification.entityType) {
              case "task":
                href = `/tasks/${notification.entityId}`
                break
              case "project":
                href = `/projects/${notification.entityId}`
                break
              default:
                href = "/tasks"
            }

            return (
              <Card
                key={notification.id}
                className={`transition-all hover:shadow-md ${
                  !notification.isRead ? "border-l-4 border-blue-500 bg-blue-50/50" : ""
                }`}
              >
                <CardContent className="p-6">
                  <Link href={href} className="block">
                    <div className="flex items-start gap-4">
                      <div className={`mt-1 ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <Badge variant="destructive" className="text-xs">
                              Новое
                            </Badge>
                          )}
                        </div>

                        <p className="text-gray-700 mb-3">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs">
                                {notification.triggeredBy.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{notification.triggeredBy.name}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{formatTime(notification.createdAt)}</span>
                          </div>

                          {notification.project && (
                            <div className="flex items-center gap-1">
                              <FolderOpen className="h-4 w-4" />
                              <span className="truncate">{notification.project.title}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
