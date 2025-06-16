"use server"

import { db } from "@/lib/db"
import { comments, auditLogs } from "@/lib/db/schema"
import { createCommentSchema } from "@/lib/validation/schemas"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { revalidatePath } from "next/cache"
import { sendCommentNotification } from "./notifications"

export async function createComment(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  const data = {
    content: formData.get("content") as string,
    taskId: formData.get("taskId") as string,
  }

  const validatedData = createCommentSchema.parse(data)

  const [comment] = await db
    .insert(comments)
    .values({
      ...validatedData,
      authorId: user.id,
    })
    .returning()

  // Аудит
  await db.insert(auditLogs).values({
    action: "comment_created",
    entityType: "comment",
    entityId: comment.id,
    userId: user.id,
    details: { taskId: comment.taskId },
  })

  // Отправляем уведомления участникам
  await sendCommentNotification(comment.taskId, user.id, comment.content)

  revalidatePath(`/tasks/${comment.taskId}`)
  return comment
}
