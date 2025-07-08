"use server"

import { db } from "@/lib/db"
import { users, tasks, projects, notifications, auditLogs } from "@/lib/db/schema"
import { eq, desc, and, count } from "drizzle-orm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"

// Создание внутреннего уведомления
export async function createNotification({
  recipientId,
  triggeredById,
  type,
  title,
  message,
  entityType,
  entityId,
  projectId,
}: {
  recipientId: string
  triggeredById: string
  type: string
  title: string
  message: string
  entityType: string
  entityId: string
  projectId?: string
}) {
  try {
    const [notification] = await db
      .insert(notifications)
      .values({
        recipientId,
        triggeredById,
        type,
        title,
        message,
        entityType,
        entityId,
        projectId: projectId || null,
      })
      .returning()

    return notification
  } catch (error) {
    console.error("Ошибка создания уведомления:", error)
    throw error
  }
}

// Уведомление о назначении задачи
export async function sendTaskAssignmentNotification(taskId: string, assigneeId: string) {
  try {
    // Получаем информацию о задаче
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        creatorId: tasks.creatorId,
        project: {
          id: projects.id,
          title: projects.title,
        },
        creator: {
          name: users.name,
        },
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(users, eq(tasks.creatorId, users.id))
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task) return

    // Создаем уведомление для назначенного пользователя
    await createNotification({
      recipientId: assigneeId,
      triggeredById: task.creatorId,
      type: "task_assigned",
      title: "Вам назначена новая задача",
      message: `${task.creator.name} назначил вам задачу "${task.title}" в проекте "${task.project.title}"`,
      entityType: "task",
      entityId: taskId,
      projectId: task.project.id,
    })

    // Логируем отправку уведомления
    await db.insert(auditLogs).values({
      action: "notification_sent",
      entityType: "task",
      entityId: taskId,
      userId: task.creatorId,
      projectId: task.project.id,
      details: { type: "task_assignment", recipientId: assigneeId },
    })
  } catch (error) {
    console.error("Ошибка отправки уведомления о назначении задачи:", error)
  }
}

// Уведомление о комментарии
export async function sendCommentNotification(taskId: string, commentAuthorId: string, content: string) {
  try {
    // Получаем информацию о задаче и участниках
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        assigneeId: tasks.assigneeId,
        creatorId: tasks.creatorId,
        project: {
          id: projects.id,
          title: projects.title,
        },
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task) return

    // Получаем автора комментария
    const [author] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, commentAuthorId))
      .limit(1)

    if (!author) return

    // Определяем кому отправлять уведомления (исполнитель и создатель, кроме автора комментария)
    const recipientIds = [task.assigneeId, task.creatorId].filter((id) => id && id !== commentAuthorId)

    // Удаляем дубликаты
    const uniqueRecipientIds = [...new Set(recipientIds)]

    for (const recipientId of uniqueRecipientIds) {
      await createNotification({
        recipientId,
        triggeredById: commentAuthorId,
        type: "comment_added",
        title: "Новый комментарий к задаче",
        message: `${author.name} добавил комментарий к задаче "${task.title}": ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
        entityType: "task",
        entityId: taskId,
        projectId: task.project.id,
      })
    }

    // Логируем отправку уведомлений
    await db.insert(auditLogs).values({
      action: "notification_sent",
      entityType: "task",
      entityId: taskId,
      userId: commentAuthorId,
      projectId: task.project.id,
      details: { type: "comment_notification", recipients: uniqueRecipientIds.length },
    })
  } catch (error) {
    console.error("Ошибка отправки уведомления о комментарии:", error)
  }
}

// Уведомление о приглашении в проект
export async function sendProjectInviteNotification(projectId: string, userId: string, role: string) {
  try {
    const [projectInfo] = await db
      .select({
        project: {
          id: projects.id,
          title: projects.title,
          ownerId: projects.ownerId,
        },
        owner: {
          name: users.name,
        },
      })
      .from(projects)
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!projectInfo) return

    const roleLabels = {
      project_manager: "Руководитель проекта",
      executor: "Исполнитель",
      observer: "Наблюдатель",
    }

    await createNotification({
      recipientId: userId,
      triggeredById: projectInfo.project.ownerId,
      type: "project_invite",
      title: "Приглашение в проект",
      message: `${projectInfo.owner.name} пригласил вас в проект "${projectInfo.project.title}" в роли "${roleLabels[role as keyof typeof roleLabels] || role}"`,
      entityType: "project",
      entityId: projectId,
      projectId,
    })
  } catch (error) {
    console.error("Ошибка отправки приглашения в проект:", error)
  }
}

// Уведомление о приближающемся дедлайне
export async function sendDeadlineReminder(taskId: string) {
  try {
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        assigneeId: tasks.assigneeId,
        dueDate: tasks.dueDate,
        project: {
          id: projects.id,
          title: projects.title,
        },
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task || !task.assigneeId || !task.dueDate) return

    const dueDate = new Date(task.dueDate)
    const formattedDate = dueDate.toLocaleDateString("ru-RU")

    await createNotification({
      recipientId: task.assigneeId,
      triggeredById: task.assigneeId, // система отправляет
      type: "deadline_reminder",
      title: "Напоминание о сроке выполнения",
      message: `Задача "${task.title}" должна быть выполнена ${formattedDate}`,
      entityType: "task",
      entityId: taskId,
      projectId: task.project.id,
    })
  } catch (error) {
    console.error("Ошибка отправки напоминания о дедлайне:", error)
  }
}

// Получение уведомлений пользователя
export async function getUserNotifications(limit = 20) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error("Не авторизован")
    }

    const user = session.user as any

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
      .limit(limit)

    return userNotifications
  } catch (error) {
    console.error("Ошибка получения уведомлений:", error)
    return [] // Возвращаем пустой массив при ошибке
  }
}

// Получение количества непрочитанных уведомлений
export async function getUnreadNotificationsCount() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return 0
    }

    const user = session.user as any

    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, user.id),
          eq(notifications.isRead, false)
        )
      )

    return result?.count || 0
  } catch (error) {
    console.error("Ошибка получения количества уведомлений:", error)
    return 0 // Возвращаем 0 при ошибке
  }
}

// Отметка уведомления как прочитанного
export async function markNotificationAsRead(notificationId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientId, user.id)
      )
    )
}

// Отметка всех уведомлений как прочитанных
export async function markAllNotificationsAsRead() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(notifications.recipientId, user.id),
        eq(notifications.isRead, false)
      )
    )
}
