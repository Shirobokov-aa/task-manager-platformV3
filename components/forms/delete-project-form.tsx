"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteProject } from "@/app/actions/projects"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

interface DeleteProjectFormProps {
  projectId: string
  projectTitle: string
}

export function DeleteProjectForm({ projectId, projectTitle }: DeleteProjectFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (confirmText !== projectTitle) {
      toast.error("Название проекта не совпадает")
      return
    }

    setIsLoading(true)
    try {
      await deleteProject(projectId)
      toast.success("Проект успешно удален")
      router.push("/projects")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка удаления проекта")
    } finally {
      setIsLoading(false)
      setIsOpen(false)
      setConfirmText("")
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Удалить проект
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить проект "{projectTitle}"?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Это действие нельзя отменить. Проект и все связанные с ним данные будут удалены навсегда:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Все задачи и подзадачи</li>
              <li>Комментарии к задачам</li>
              <li>Загруженные файлы</li>
              <li>История участников</li>
              <li>Записи аудита</li>
            </ul>
            <div className="space-y-2">
              <Label htmlFor="confirm-text">
                Для подтверждения введите название проекта: <strong>{projectTitle}</strong>
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Введите название проекта"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>
            Отмена
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== projectTitle || isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? "Удаление..." : "Удалить проект"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
