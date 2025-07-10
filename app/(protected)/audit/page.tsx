import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { auditLogs, users, projects } from "@/lib/db/schema"
import { eq, desc, or } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { FileText, Clock } from "lucide-react"

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId: string
  details: Record<string, unknown>
  createdAt: Date | null
  user: {
    name: string
    email: string
  }
  project?: {
    title: string
  }
}

const actionLabels: Record<string, string> = {
  project_created: "Создан проект",
  project_deleted: "Удален проект",
  project_updated: "Обновлен проект",
  member_added: "Добавлен участник",
  member_removed: "Удален участник",
  member_role_changed: "Изменена роль участника",
  task_created: "Создана задача",
  task_status_changed: "Изменен статус задачи",
  task_assigned: "Назначена задача",
  comment_created: "Добавлен комментарий",
  file_uploaded: "Загружен файл",
  file_deleted: "Удален файл",
  notification_sent: "Отправлено уведомление",
  user_created: "Создан пользователь",
  user_updated: "Обновлен пользователь",
  profile_updated: "Обновлен профиль",
}

const actionColors: Record<string, string> = {
  project_created: "bg-blue-100 text-blue-800",
  project_deleted: "bg-red-100 text-red-800",
  project_updated: "bg-blue-100 text-blue-800",
  member_added: "bg-green-100 text-green-800",
  member_removed: "bg-red-100 text-red-800",
  member_role_changed: "bg-yellow-100 text-yellow-800",
  task_created: "bg-purple-100 text-purple-800",
  task_status_changed: "bg-yellow-100 text-yellow-800",
  task_assigned: "bg-indigo-100 text-indigo-800",
  comment_created: "bg-gray-100 text-gray-800",
  file_uploaded: "bg-orange-100 text-orange-800",
  file_deleted: "bg-red-100 text-red-800",
  notification_sent: "bg-cyan-100 text-cyan-800",
  user_created: "bg-emerald-100 text-emerald-800",
  user_updated: "bg-emerald-100 text-emerald-800",
  profile_updated: "bg-emerald-100 text-emerald-800",
}

// Функция для форматирования деталей аудита в понятный текст
function formatAuditDetails(action: string, details: Record<string, unknown>): string {
  switch (action) {
    case 'task_status_changed':
      const oldStatus = getStatusLabel(details.oldStatus as string);
      const newStatus = getStatusLabel(details.newStatus as string);
      return `Статус изменен с "${oldStatus}" на "${newStatus}"`;

    case 'project_created':
      return `Создан проект "${details.title || 'Без названия'}"`;

    case 'project_deleted':
      return `Удален проект "${details.title || 'Без названия'}"`;

    case 'project_updated':
      return `Обновлены настройки проекта`;

    case 'task_created':
      return `Создана задача "${details.title || 'Без названия'}"${details.assigneeId ? ' и назначена исполнителю' : ''}`;

    case 'task_assigned':
      return `Назначена задача исполнителю`;

    case 'member_added':
      return `Добавлен участник в проект`;

    case 'member_removed':
      return `Удален участник из проекта`;

    case 'member_role_changed':
      return `Изменена роль участника`;

    case 'file_uploaded':
      const fileSize = details.fileSize as number;
      const fileName = details.filename as string;
      return `Загружен файл "${fileName}"${fileSize ? ` (${Math.round(fileSize / 1024)} KB)` : ''}`;

    case 'file_deleted':
      return `Удален файл "${details.filename || 'Неизвестный файл'}"`;

    case 'comment_created':
      return `Добавлен комментарий к задаче`;

    case 'notification_sent':
      const type = details.type as string;
      const recipients = details.recipients as any[];
      return `Отправлено уведомление ${getNotificationTypeLabel(type)}${recipients ? ` (получателей: ${recipients.length})` : ''}`;

    case 'user_created':
      return `Создан новый пользователь`;

    case 'user_updated':
      return `Обновлен профиль пользователя`;

    case 'profile_updated':
      return `Обновлен профиль пользователя`;

    default:
      // Для неизвестных действий показываем базовую информацию
      return `Выполнено действие в системе`;
  }
}

// Вспомогательная функция для перевода статусов
function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    open: "Открыто",
    in_progress: "В работе",
    completed: "Завершено",
    cancelled: "Отменено",
  };
  return statusLabels[status] || status;
}

// Вспомогательная функция для перевода типов уведомлений
function getNotificationTypeLabel(type: string): string {
  const typeLabels: Record<string, string> = {
    task_assignment: "о назначении задачи",
    comment_notification: "о новом комментарии",
    deadline_reminder: "напоминание о сроке",
    status_change: "об изменении статуса",
  };
  return typeLabels[type] || "системное";
}

export default async function AuditPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Проверяем права доступа к аудиту
  if (user.role !== "admin" && user.role !== "project_manager") {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Доступ запрещен</h3>
        <p className="text-gray-600">У вас нет прав для просмотра журнала аудита</p>
      </div>
    )
  }

  // Получаем логи аудита
  let query = db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      user: {
        name: users.name,
        email: users.email,
      },
      project: {
        title: projects.title,
      },
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(projects, eq(auditLogs.projectId, projects.id))

  // Если пользователь не админ, показываем только логи его проектов
  if (user.role !== "admin") {
    query = query.where(or(eq(projects.ownerId, user.id), eq(auditLogs.userId, user.id))) as typeof query
  }

  const logs = await query.orderBy(desc(auditLogs.createdAt)).limit(100) as AuditLog[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Журнал аудита</h1>
          <p className="text-gray-600 mt-2">История действий пользователей в системе</p>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-600" />
          <span className="text-sm text-gray-600">{logs.length} записей</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Последние действия</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-gray-600 text-center py-8">Записи аудита не найдены</p>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>{log.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{log.user.name}</span>
                      <Badge className={actionColors[log.action] || "bg-gray-100 text-gray-800"}>
                        {actionLabels[log.action] || log.action}
                      </Badge>
                      {log.project && <span className="text-sm text-gray-600">в проекте "{log.project.title}"</span>}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(log.createdAt!).toLocaleString("ru-RU")}</span>
                    </div>

                    {log.details && (
                      <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        {formatAuditDetails(log.action, log.details)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
