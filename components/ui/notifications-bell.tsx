"use client"

import { useState, useEffect } from "react"
import { Bell, Check, CheckCheck, Clock, MessageSquare, User, FolderOpen, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  getUserNotifications,
  getUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from "@/app/actions/notifications"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

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

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  // Загрузка уведомлений при открытии
  const loadNotifications = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      const [notificationsData, count] = await Promise.all([
        getUserNotifications(20),
        getUnreadNotificationsCount()
      ])

      setNotifications(notificationsData)
      setUnreadCount(count)
    } catch (error) {
      console.error("Ошибка загрузки уведомлений:", error)
      toast.error("Ошибка загрузки уведомлений")
    } finally {
      setIsLoading(false)
    }
  }

  // Загрузка счетчика при монтировании
  useEffect(() => {
    getUnreadNotificationsCount()
      .then(setUnreadCount)
      .catch((error) => {
        console.error("Ошибка загрузки счетчика уведомлений:", error)
        setUnreadCount(0) // Устанавливаем 0 если произошла ошибка
      })
  }, [])

  // Обработка клика по уведомлению
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Отмечаем как прочитанное
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id)
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }

      // Переходим к соответствующей странице
      let path = ""
      switch (notification.entityType) {
        case "task":
          path = `/tasks/${notification.entityId}`
          break
        case "project":
          path = `/projects/${notification.entityId}`
          break
        default:
          path = "/tasks"
      }

      setIsOpen(false)
      router.push(path)
    } catch (error) {
      console.error("Ошибка обработки уведомления:", error)
      toast.error("Ошибка обработки уведомления")
    }
  }

  // Отметить все как прочитанные
  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast.success("Все уведомления отмечены как прочитанные")
    } catch (error) {
      console.error("Ошибка отметки уведомлений:", error)
      toast.error("Ошибка отметки уведомлений")
    }
  }

  // Форматирование времени
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative"
          onClick={() => {
            if (!isOpen) loadNotifications()
          }}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Уведомления</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Отметить все
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              Загрузка...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Уведомлений нет</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification, index) => {
                const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Bell
                const colorClass = notificationColors[notification.type as keyof typeof notificationColors] || "text-gray-600"

                return (
                  <div key={notification.id}>
                    <div
                      className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? "bg-blue-50 border-l-4 border-blue-500" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium truncate">
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(notification.createdAt)}</span>
                            {notification.project && (
                              <>
                                <span>•</span>
                                <span className="truncate">{notification.project.title}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {index < notifications.length - 1 && (
                      <Separator className="my-1" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                setIsOpen(false)
                router.push("/notifications")
              }}
            >
              Показать все уведомления
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
