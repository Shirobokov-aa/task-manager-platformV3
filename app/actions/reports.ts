"use server"

import { db } from "@/lib/db"
import { projects, tasks, users, projectMembers } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { canExportReports } from "@/lib/permissions"
import PDFDocument from "pdfkit"
import type { default as PDFKit } from "pdfkit"
import ExcelJS from "exceljs"

interface ProjectData {
  id: string
  title: string
  description: string | null
  createdAt: string | null
  owner: string
  totalTasks: number
  completedTasks: number
  membersCount: number
}

export async function exportProjectsReport(format: "pdf" | "excel") {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any
  if (!canExportReports(user)) {
    throw new Error("Недостаточно прав для экспорта отчетов")
  }

  // Получаем данные для отчета
  const projectsData = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      createdAt: sql<string>`to_char(${projects.createdAt}, 'YYYY-MM-DD')`,
      owner: users.name,
      totalTasks: sql<number>`COUNT(${tasks.id})`,
      completedTasks: sql<number>`COUNT(CASE WHEN ${tasks.status} = 'completed' THEN 1 END)`,
      membersCount: sql<number>`(SELECT COUNT(*) FROM ${projectMembers} WHERE ${projectMembers.projectId} = ${projects.id})`,
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .leftJoin(tasks, eq(projects.id, tasks.projectId))
    .groupBy(projects.id, users.name)
    .orderBy(desc(projects.createdAt))

  if (format === "pdf") {
    return generateProjectsPDF(projectsData)
  } else {
    return generateProjectsExcel(projectsData)
  }
}

async function generateProjectsPDF(data: ProjectData[]) {
  const doc = new PDFDocument()
  const chunks: Buffer[] = []

  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))

    // Заголовок
    doc.fontSize(20).text("Отчет по проектам", { align: "center" })
    doc.moveDown()
    doc.fontSize(12).text(`Дата создания: ${new Date().toLocaleDateString("ru-RU")}`)
    doc.moveDown()

    // Таблица проектов
    let y = doc.y
    const tableTop = y
    const itemHeight = 20

    // Заголовки таблицы
    doc.text("Проект", 50, y)
    doc.text("Владелец", 200, y)
    doc.text("Задачи", 300, y)
    doc.text("Завершено", 350, y)
    doc.text("Участники", 420, y)
    doc.text("Дата создания", 480, y)

    y += itemHeight

    // Данные
    data.forEach((project, i) => {
      const completion = project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0

      doc.text(project.title.substring(0, 20), 50, y)
      doc.text(project.owner, 200, y)
      doc.text(project.totalTasks.toString(), 300, y)
      doc.text(`${project.completedTasks} (${completion}%)`, 350, y)
      doc.text(project.membersCount.toString(), 420, y)
      doc.text(project.createdAt || "Не указано", 480, y)

      y += itemHeight

      // Новая страница если нужно
      if (y > 700) {
        doc.addPage()
        y = 50
      }
    })

    doc.end()
  })
}

async function generateProjectsExcel(data: any[]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Проекты")

  // Заголовки
  worksheet.columns = [
    { header: "Название проекта", key: "title", width: 30 },
    { header: "Описание", key: "description", width: 40 },
    { header: "Владелец", key: "owner", width: 20 },
    { header: "Всего задач", key: "totalTasks", width: 15 },
    { header: "Завершено задач", key: "completedTasks", width: 15 },
    { header: "Процент завершения", key: "completion", width: 15 },
    { header: "Участников", key: "membersCount", width: 15 },
    { header: "Дата создания", key: "createdAt", width: 15 },
  ]

  // Данные
  data.forEach((project) => {
    const completion = project.totalTasks > 0 ? Math.round((project.completedTasks / project.totalTasks) * 100) : 0

    worksheet.addRow({
      title: project.title,
      description: project.description || "",
      owner: project.owner,
      totalTasks: project.totalTasks,
      completedTasks: project.completedTasks,
      completion: `${completion}%`,
      membersCount: project.membersCount,
      createdAt: new Date(project.createdAt).toLocaleDateString("ru-RU"),
    })
  })

  // Стилизация заголовков
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

export async function exportTasksReport(format: "pdf" | "excel", projectId?: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any
  if (!canExportReports(user)) {
    throw new Error("Недостаточно прав для экспорта отчетов")
  }

  // Получаем данные о задачах
  let query = db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      complexity: tasks.complexity,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      project: {
        title: projects.title,
      },
      assignee: {
        name: users.name,
      },
      creator: {
        name: users.name,
      },
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .innerJoin(users, eq(tasks.creatorId, users.id))

  if (projectId) {
    query = query.where(eq(tasks.projectId, projectId)) as any
  }

  const tasksData = await query.orderBy(desc(tasks.createdAt))

  if (format === "pdf") {
    return generateTasksPDF(tasksData)
  } else {
    return generateTasksExcel(tasksData)
  }
}

async function generateTasksPDF(data: any[]) {
  const doc = new PDFDocument()
  const chunks: Buffer[] = []

  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))

    // Заголовок
    doc.fontSize(20).text("Отчет по задачам", { align: "center" })
    doc.moveDown()
    doc.fontSize(12).text(`Дата создания: ${new Date().toLocaleDateString("ru-RU")}`)
    doc.moveDown()

    // Статистика
    const totalTasks = data.length
    const completedTasks = data.filter((t) => t.status === "completed").length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    doc.text(`Всего задач: ${totalTasks}`)
    doc.text(`Завершено: ${completedTasks} (${completionRate}%)`)
    doc.moveDown()

    // Задачи
    data.forEach((task, i) => {
      if (doc.y > 700) {
        doc.addPage()
      }

      doc.fontSize(14).text(`${i + 1}. ${task.title}`, { continued: false })
      doc.fontSize(10)
      doc.text(`Проект: ${task.project.title}`)
      doc.text(`Статус: ${task.status} | Приоритет: ${task.priority}`)
      doc.text(`Исполнитель: ${task.assignee.name || "Не назначен"}`)
      doc.text(`Создано: ${new Date(task.createdAt).toLocaleDateString("ru-RU")}`)

      if (task.description) {
        doc.text(`Описание: ${task.description.substring(0, 100)}...`)
      }

      doc.moveDown()
    })

    doc.end()
  })
}

async function generateTasksExcel(data: any[]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Задачи")

  // Заголовки
  worksheet.columns = [
    { header: "Название задачи", key: "title", width: 30 },
    { header: "Проект", key: "project", width: 20 },
    { header: "Статус", key: "status", width: 15 },
    { header: "Приоритет", key: "priority", width: 15 },
    { header: "Сложность", key: "complexity", width: 10 },
    { header: "Исполнитель", key: "assignee", width: 20 },
    { header: "Создатель", key: "creator", width: 20 },
    { header: "Срок выполнения", key: "dueDate", width: 15 },
    { header: "Дата создания", key: "createdAt", width: 15 },
    { header: "Описание", key: "description", width: 40 },
  ]

  // Данные
  data.forEach((task) => {
    worksheet.addRow({
      title: task.title,
      project: task.project.title,
      status: task.status,
      priority: task.priority,
      complexity: task.complexity,
      assignee: task.assignee.name || "Не назначен",
      creator: task.creator.name,
      dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString("ru-RU") : "",
      createdAt: new Date(task.createdAt).toLocaleDateString("ru-RU"),
      description: task.description || "",
    })
  })

  // Стилизация
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
