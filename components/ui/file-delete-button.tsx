"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface FileDeleteButtonProps {
  fileId: string
  fileName: string
  canDelete?: boolean
}

export function FileDeleteButton({ fileId, fileName, canDelete = false }: FileDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Файл успешно удален")
        router.refresh() // Обновляем страницу для отображения изменений
      } else if (response.status === 403) {
        toast.error("У вас нет прав для удаления этого файла")
      } else if (response.status === 404) {
        toast.error("Файл не найден")
      } else {
        toast.error("Ошибка при удалении файла")
      }
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Ошибка при удалении файла")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!canDelete) {
    return null
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить файл?</AlertDialogTitle>
          <AlertDialogDescription>
            Вы уверены, что хотите удалить файл "{fileName}"? Это действие нельзя отменить.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Удаление..." : "Удалить"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
