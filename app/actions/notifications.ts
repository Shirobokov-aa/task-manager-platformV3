"use server"

import { db } from "@/lib/db"
import { users, tasks, projects, auditLogs } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { sendEmail } from "@/lib/email"

export async function sendTaskAssignmentNotification(taskId: string, assigneeId: string) {
  try {
    // Получаем информацию о задаче и пользователе
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
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
      .innerJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task || !task.assignee) return

    const emailContent = `
      <h2>Вам назначена новая задача</h2>
      <p>Здравствуйте, ${task.assignee.name}!</p>
      <p>Вам была назначена новая задача в проекте "${task.project.title}":</p>

      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3>${task.title}</h3>
        ${task.description ? `<p>${task.description}</p>` : ""}
      </div>

      <p>Перейдите в систему для просмотра деталей задачи.</p>
      <p>С уважением,<br>Команда Задачника</p>
    `

    await sendEmail({
      to: task.assignee.email,
      subject: `Новая задача: ${task.title}`,
      html: emailContent,
    })

    // Логируем отправку уведомления
    await db.insert(auditLogs).values({
      action: "notification_sent",
      entityType: "task",
      entityId: taskId,
      userId: assigneeId,
      details: { type: "task_assignment", email: task.assignee.email },
    })
  } catch (error) {
    console.error("Ошибка отправки уведомления:", error)
  }
}

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
          title: projects.title,
        },
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(tasks.id, taskId))
      .limit(1)

    if (!task) return

    // Получаем автора комментария
    const [author] = await db.select({ name: users.name }).from(users).where(eq(users.id, commentAuthorId)).limit(1)

    if (!author) return

    // Определяем кому отправлять уведомления (исполнитель и создатель, кроме автора комментария)
    const recipientIds = [task.assigneeId, task.creatorId].filter((id) => id && id !== commentAuthorId)

    for (const recipientId of recipientIds) {
      const [recipient] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, recipientId))
        .limit(1)

      if (!recipient) continue

      const emailContent = `
        <h2>Новый комментарий к задаче</h2>
        <p>Здравствуйте, ${recipient.name}!</p>
        <p>${author.name} добавил комментарий к задаче "${task.title}" в проекте "${task.project.title}":</p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>${author.name}:</strong></p>
          <p>${content}</p>
        </div>

        <p>Перейдите в систему для просмотра полного обсуждения.</p>
        <p>С уважением,<br>Команда Задачника</p>
      `

      await sendEmail({
        to: recipient.email,
        subject: `Новый комментарий: ${task.title}`,
        html: emailContent,
      })
    }

    // Логируем отправку уведомлений
    await db.insert(auditLogs).values({
      action: "notification_sent",
      entityType: "task",
      entityId: taskId,
      userId: commentAuthorId,
      details: { type: "comment_notification", recipients: recipientIds.length },
    })
  } catch (error) {
    console.error("Ошибка отправки уведомления о комментарии:", error)
  }
}

export async function sendProjectInviteNotification(projectId: string, userId: string, role: string) {
  try {
    const [projectInfo] = await db
      .select({
        project: {
          title: projects.title,
        },
        user: {
          name: users.name,
          email: users.email,
        },
        owner: {
          name: users.name,
        },
      })
      .from(projects)
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.id, projectId))
      .limit(1)

    // Получаем информацию о приглашаемом пользователе отдельным запросом
    const [invitedUser] = await db
      .select({
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!projectInfo || !invitedUser) return

    const roleLabels = {
      project_manager: "Руководитель проекта",
      executor: "Исполнитель",
      observer: "Наблюдатель",
    }

    const emailContent = `
      <h2>Приглашение в проект</h2>
      <p>Здравствуйте, ${invitedUser.name}!</p>
      <p>Вас пригласили участвовать в проекте "${projectInfo.project.title}" в роли "${roleLabels[role as keyof typeof roleLabels]}".</p>
      <p>Приглашение отправил: ${projectInfo.owner.name}</p>

      <p>Войдите в систему для начала работы с проектом.</p>
      <p>С уважением,<br>Команда Задачника</p>
    `

    await sendEmail({
      to: invitedUser.email,
      subject: `Приглашение в проект: ${projectInfo.project.title}`,
      html: emailContent,
    })
  } catch (error) {
    console.error("Ошибка отправки приглашения в проект:", error)
  }
}
