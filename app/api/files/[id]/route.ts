import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { files, projectMembers, auditLogs } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import path from "path"
import fs from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = session.user as any

    // Получаем информацию о файле
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, params.id))
      .limit(1)

    if (!file) {
      return new NextResponse("File not found", { status: 404 })
    }

    // Проверяем права доступа к проекту
    if (user.role !== "admin" && file.projectId) {
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, file.projectId),
            eq(projectMembers.userId, user.id)
          )
        )
        .limit(1)

      if (!membership) {
        return new NextResponse("Access denied", { status: 403 })
      }
    }

    // Путь к файлу - используем filePath из БД или собираем из uploads/filename
    const filePath = file.filePath || path.join(process.cwd(), "uploads", file.filename)

    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found on disk", { status: 404 })
    }

    // Читаем файл
    const fileBuffer = fs.readFileSync(filePath)

    // Логируем успешное скачивание
    console.log(`File downloaded: ${file.originalName} by user ${user.email}`)

    // Правильно кодируем имя файла для поддержки кириллицы
    const encodedFileName = encodeURIComponent(file.originalName)
    const asciiFileName = file.originalName.replace(/[^\x00-\x7F]/g, "_") // fallback для старых браузеров

    // Возвращаем файл
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": file.fileSize.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Error downloading file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = session.user as any

    // Получаем информацию о файле
    const [file] = await db
      .select()
      .from(files)
      .where(eq(files.id, params.id))
      .limit(1)

    if (!file) {
      return new NextResponse("File not found", { status: 404 })
    }

    // Проверяем права на удаление файла
    // Файл может удалить: админ, автор файла, или владелец проекта
    let canDelete = user.role === "admin" || file.uploadedBy === user.id

    if (!canDelete && file.projectId) {
      // Проверяем роль пользователя в проекте
      const [membership] = await db
        .select({
          role: projectMembers.role,
        })
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, file.projectId),
            eq(projectMembers.userId, user.id)
          )
        )
        .limit(1)

      // Позволяем удалять файлы участникам проекта с ролью manager или owner
      if (membership && (membership.role === "manager" || membership.role === "owner")) {
        canDelete = true
      }
    }

    if (!canDelete) {
      return new NextResponse("Access denied", { status: 403 })
    }

    // Удаляем физический файл
    const filePath = file.filePath || path.join(process.cwd(), "uploads", file.filename)

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath)
        console.log(`Physical file deleted: ${filePath}`)
      } catch (error) {
        console.error("Error deleting physical file:", error)
        // Продолжаем удаление записи из БД даже если физический файл не удалился
      }
    }

    // Удаляем запись из базы данных
    await db
      .delete(files)
      .where(eq(files.id, params.id))

    // Добавляем запись в аудит
    await db.insert(auditLogs).values({
      action: "file_deleted",
      entityType: "file",
      entityId: params.id,
      userId: user.id,
      projectId: file.projectId,
      details: {
        filename: file.originalName,
        fileSize: file.fileSize
      },
    })

    // Логируем успешное удаление
    console.log(`File deleted: ${file.originalName} by user ${user.email}`)

    return new NextResponse("File deleted successfully", { status: 200 })
  } catch (error) {
    console.error("Error deleting file:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
