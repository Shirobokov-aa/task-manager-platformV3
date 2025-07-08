import { type NextRequest, NextResponse } from "next/server"
import { exportProjectsReport, exportTasksReport } from "@/app/actions/reports"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") // 'projects' | 'tasks'
    const format = searchParams.get("format") as "pdf" | "excel"
    const projectId = searchParams.get("projectId")

    if (!type || !format) {
      return NextResponse.json({ error: "Не указан тип или формат отчета" }, { status: 400 })
    }

    let buffer: Buffer
    let filename: string
    let contentType: string

    if (type === "projects") {
      buffer = await exportProjectsReport(format)
      filename = `projects-report-${new Date().toISOString().split("T")[0]}`
    } else if (type === "tasks") {
      buffer = await exportTasksReport(format, projectId || undefined)
      filename = `tasks-report-${new Date().toISOString().split("T")[0]}`
    } else {
      return NextResponse.json({ error: "Неизвестный тип отчета" }, { status: 400 })
    }

    if (format === "pdf") {
      filename += ".pdf"
      contentType = "application/pdf"
    } else {
      filename += ".xlsx"
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Ошибка экспорта отчета:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка экспорта отчета" },
      { status: 500 },
    )
  }
}

// Помечаем роут как динамический
export const dynamic = 'force-dynamic'
