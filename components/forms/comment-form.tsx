"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createComment } from "@/app/actions/comments"
import { toast } from "sonner"

interface CommentFormProps {
  taskId: string
}

export function CommentForm({ taskId }: CommentFormProps) {
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("content", content)
      formData.append("taskId", taskId)

      await createComment(formData)
      setContent("")
      toast.success("Комментарий добавлен")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка добавления комментария")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Добавить комментарий..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
      />
      <Button type="submit" disabled={isLoading || !content.trim()}>
        {isLoading ? "Добавление..." : "Добавить комментарий"}
      </Button>
    </form>
  )
}
