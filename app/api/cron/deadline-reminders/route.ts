import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { tasks } from "@/lib/db/schema"
import { and, eq, gte, lte, isNotNull } from "drizzle-orm"
import { sendDeadlineReminder } from "@/app/actions/notifications"

export async function POST(request: NextRequest) {
  try {
    // Проверяем, что запрос идет от cron или внутренней системы
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // Находим задачи с дедлайном завтра или послезавтра
    const tasksWithDeadlines = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        assigneeId: tasks.assigneeId,
      })
      .from(tasks)
      .where(
        and(
          isNotNull(tasks.assigneeId),
          isNotNull(tasks.dueDate),
          eq(tasks.status, "open"), // только открытые задачи
          gte(tasks.dueDate, tomorrow),
          lte(tasks.dueDate, dayAfterTomorrow)
        )
      )

    console.log(`Найдено задач с приближающимися дедлайнами: ${tasksWithDeadlines.length}`)

    // Отправляем напоминания
    const results = await Promise.allSettled(
      tasksWithDeadlines.map(task => sendDeadlineReminder(task.id))
    )

    const successful = results.filter(r => r.status === "fulfilled").length
    const failed = results.filter(r => r.status === "rejected").length

    console.log(`Отправлено напоминаний: ${successful}, ошибок: ${failed}`)

    return NextResponse.json({
      success: true,
      tasksProcessed: tasksWithDeadlines.length,
      remindersSent: successful,
      errors: failed,
    })
  } catch (error) {
    console.error("Ошибка отправки напоминаний о дедлайнах:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Метод GET для ручного тестирования
export async function GET() {
  return NextResponse.json({
    message: "Deadline reminders endpoint",
    usage: "Use POST with proper authorization",
  })
}
