"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { updateProject } from "@/app/actions/projects"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ProjectSettingsFormProps {
  project: {
    id: string
    title: string
    description: string | null
  }
}

export function ProjectSettingsForm({ project }: ProjectSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    try {
      formData.append("projectId", project.id)
      await updateProject(formData)
      toast.success("Настройки проекта обновлены")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка обновления проекта")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Название проекта</Label>
        <Input id="title" name="title" defaultValue={project.title} placeholder="Введите название проекта" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Описание</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={project.description || ""}
          placeholder="Описание проекта"
          rows={4}
        />
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Сохранение..." : "Сохранить изменения"}
      </Button>
    </form>
  )
}
