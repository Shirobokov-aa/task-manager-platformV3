"use server"

import { db } from "@/lib/db"
import { tasks, auditLogs } from "@/lib/db/schema"
import { createTaskSchema, updateTaskStatusSchema } from "@/lib/validation/schemas"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { sendTaskAssignmentNotification } from "./notifications"

export async function createTask(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  const data = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    projectId: formData.get("projectId") as string,
    parentTaskId: (formData.get("parentTaskId") as string) || undefined,
    assigneeId: (formData.get("assigneeId") as string) || undefined,
    priority: (formData.get("priority") as string) || "medium",
    complexity: Number.parseInt(formData.get("complexity") as string) || 1,
    dueDate: (formData.get("dueDate") as string) || undefined,
    tags: formData.get("tags") ? (formData.get("tags") as string).split(",") : [],
  }

  const validatedData = createTaskSchema.parse(data)

  // Проверяем права на создание задачи
  // Здесь нужно получить информацию о проекте для проверки прав
  // Упрощенная проверка - позже можно расширить

  const [task] = await db
    .insert(tasks)
    .values({
      ...validatedData,
      creatorId: user.id,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
    })
    .returning()

  // Отправляем уведомление исполнителю
  if (task.assigneeId) {
    await sendTaskAssignmentNotification(task.id, task.assigneeId)
  }

  // Аудит
  await db.insert(auditLogs).values({
    action: "task_created",
    entityType: "task",
    entityId: task.id,
    userId: user.id,
    projectId: task.projectId,
    details: { title: task.title, assigneeId: task.assigneeId },
  })

  revalidatePath(`/projects/${task.projectId}`)
  return task
}

export async function updateTaskStatus(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  const data = {
    taskId: formData.get("taskId") as string,
    status: formData.get("status") as string,
  }

  const validatedData = updateTaskStatusSchema.parse(data)

  // Получаем задачу для проверки прав
  const [task] = await db.select().from(tasks).where(eq(tasks.id, validatedData.taskId)).limit(1)
  if (!task) {
    throw new Error("Задача не найдена")
  }

  // Здесь нужна более сложная проверка прав с учетом владельца проекта
  // Упрощенная версия
  if (task.assigneeId !== user.id && user.role !== "admin") {
    throw new Error("Недостаточно прав для изменения статуса задачи")
  }

  await db
    .update(tasks)
    .set({
      status: validatedData.status,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, validatedData.taskId))

  // Аудит
  await db.insert(auditLogs).values({
    action: "task_status_changed",
    entityType: "task",
    entityId: task.id,
    userId: user.id,
    projectId: task.projectId,
    details: { oldStatus: task.status, newStatus: validatedData.status },
  })

  revalidatePath(`/tasks/${task.id}`)
  revalidatePath(`/projects/${task.projectId}`)
}
