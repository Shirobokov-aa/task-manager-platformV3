"use server"

import { db } from "@/lib/db"
import { files, auditLogs } from "@/lib/db/schema"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { revalidatePath } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"
import { eq } from "drizzle-orm"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]

export async function uploadFile(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any
  const file = formData.get("file") as File | null
  const projectId = formData.get("projectId") as string | null
  const taskId = formData.get("taskId") as string | null
  const description = formData.get("description") as string | null

  if (!file || !(file instanceof File)) {
    throw new Error("Файл не выбран")
  }

  // Проверяем размер файла
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Размер файла превышает 10MB")
  }

  // Проверяем тип файла
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Неподдерживаемый тип файла")
  }

  // Создаем уникальное имя файла
  const fileExtension = file.name.split(".").pop()
  const filename = `${uuidv4()}.${fileExtension}`

  // Определяем путь для сохранения
  const uploadDir = join(process.cwd(), "uploads")
  const filePath = join(uploadDir, filename)

  try {
    // Создаем директорию если не существует
    await mkdir(uploadDir, { recursive: true })

    // Сохраняем файл
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Сохраняем информацию в БД
    const [savedFile] = await db
      .insert(files)
      .values({
        filename,
        originalName: file.name,
        filePath: `/uploads/${filename}`,
        fileSize: file.size,
        mimeType: file.type,
        description: description || null,
        projectId: projectId || null,
        taskId: taskId || null,
        uploadedBy: user.id,
      })
      .returning()

    // Аудит
    await db.insert(auditLogs).values({
      action: "file_uploaded",
      entityType: "file",
      entityId: savedFile.id,
      userId: user.id,
      projectId: projectId || null,
      details: {
        filename: file.name,
        fileSize: file.size,
        taskId: taskId || null,
      },
    })

    if (projectId) {
      revalidatePath(`/projects/${projectId}`)
    }
    if (taskId) {
      revalidatePath(`/tasks/${taskId}`)
    }

    return savedFile
  } catch (error) {
    throw new Error("Ошибка загрузки файла")
  }
}

export async function deleteFile(fileId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  // Получаем информацию о файле
  const [file] = await db.select().from(files).where(eq(files.id, fileId)).limit(1)

  if (!file) {
    throw new Error("Файл не найден")
  }

  // Проверяем права (владелец файла или админ)
  if (file.uploadedBy !== user.id && user.role !== "admin") {
    throw new Error("Недостаточно прав для удаления файла")
  }

  // Удаляем из БД
  await db.delete(files).where(eq(files.id, fileId))

  // Аудит
  await db.insert(auditLogs).values({
    action: "file_deleted",
    entityType: "file",
    entityId: fileId,
    userId: user.id,
    projectId: file.projectId,
    details: { filename: file.originalName },
  })

  if (file.projectId) {
    revalidatePath(`/projects/${file.projectId}`)
  }
  if (file.taskId) {
    revalidatePath(`/tasks/${file.taskId}`)
  }
}
