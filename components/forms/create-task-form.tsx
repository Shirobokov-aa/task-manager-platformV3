"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createTask } from "@/app/actions/tasks"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface CreateTaskFormProps {
  projectId: string
  parentTaskId?: string
  users: Array<{ id: string; name: string; email: string }>
}

export function CreateTaskForm({ projectId, parentTaskId, users }: CreateTaskFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [priority, setPriority] = useState("medium")
  const [assigneeId, setAssigneeId] = useState("")
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    formData.append("projectId", projectId)
    if (parentTaskId) {
      formData.append("parentTaskId", parentTaskId)
    }
    formData.append("priority", priority)
    if (assigneeId) {
      formData.append("assigneeId", assigneeId)
    }

    setIsLoading(true)
    try {
      await createTask(formData)
      toast.success("Задача успешно создана")
      router.back()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка создания задачи")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{parentTaskId ? "Создать подзадачу" : "Создать новую задачу"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Название задачи</Label>
            <Input id="title" name="title" placeholder="Введите название задачи" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea id="description" name="description" placeholder="Описание задачи" rows={4} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="critical">Критический</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complexity">Сложность (1-10)</Label>
              <Input id="complexity" name="complexity" type="number" min="1" max="10" defaultValue="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Исполнитель</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите исполнителя" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Срок выполнения</Label>
              <Input id="dueDate" name="dueDate" type="datetime-local" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Теги (через запятую)</Label>
            <Input id="tags" name="tags" placeholder="frontend, backend, urgent" />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Создание..." : "Создать задачу"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
