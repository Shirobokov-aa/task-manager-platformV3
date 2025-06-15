"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateTaskStatus } from "@/app/actions/tasks"
import { toast } from "sonner"

interface TaskStatusFormProps {
  taskId: string
  currentStatus: string
}

const statusOptions = [
  { value: "open", label: "Открыта" },
  { value: "in_progress", label: "В работе" },
  { value: "completed", label: "Завершена" },
  { value: "cancelled", label: "Отменена" },
]

export function TaskStatusForm({ taskId, currentStatus }: TaskStatusFormProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit() {
    if (status === currentStatus) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("taskId", taskId)
      formData.append("status", status)

      await updateTaskStatus(formData)
      toast.success("Статус задачи обновлен")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка обновления статуса")
      setStatus(currentStatus) // Возвращаем предыдущий статус
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Статус задачи</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {status !== currentStatus && (
        <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
          {isLoading ? "Обновление..." : "Обновить статус"}
        </Button>
      )}
    </div>
  )
}
