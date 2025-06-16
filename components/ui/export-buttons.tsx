"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, FileText, Table } from "lucide-react"
import { toast } from "sonner"

interface ExportButtonsProps {
  type: "projects" | "tasks"
  projectId?: string
}

export function ExportButtons({ type, projectId }: ExportButtonsProps) {
  const handleExport = async (format: "pdf" | "excel") => {
    try {
      const params = new URLSearchParams({
        type,
        format,
      })

      if (projectId) {
        params.append("projectId", projectId)
      }

      const response = await fetch(`/api/reports/export?${params}`)

      if (!response.ok) {
        throw new Error("Ошибка экспорта")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      const contentDisposition = response.headers.get("content-disposition")
      const filename =
        contentDisposition?.split("filename=")[1]?.replace(/"/g, "") ||
        `${type}-report.${format === "pdf" ? "pdf" : "xlsx"}`

      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Отчет успешно экспортирован")
    } catch (error) {
      toast.error("Ошибка экспорта отчета")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileText className="h-4 w-4 mr-2" />
          Экспорт в PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <Table className="h-4 w-4 mr-2" />
          Экспорт в Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
