"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { uploadFile } from "@/app/actions/files"
import { toast } from "sonner"
import { Upload, File, X } from "lucide-react"
import { useRouter } from "next/navigation"

interface FileUploadFormProps {
  projectId?: string
  taskId?: string
}

export function FileUploadForm({ projectId, taskId }: FileUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
    }
  }

  async function handleSubmit(formData: FormData) {
    if (!selectedFile) {
      toast.error("Выберите файл для загрузки")
      return
    }

    formData.append("file", selectedFile)
    if (projectId) formData.append("projectId", projectId)
    if (taskId) formData.append("taskId", taskId)

    setIsLoading(true)
    try {
      await uploadFile(formData)
      toast.success("Файл успешно загружен")
      setSelectedFile(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка загрузки файла")
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Загрузить файл
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {/* Drag & Drop зона */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? "border-blue-500 bg-blue-50"
                : selectedFile
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <File className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-green-800">{selectedFile.name}</p>
                  <p className="text-sm text-green-600">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">Перетащите файл сюда или нажмите для выбора</p>
                <p className="text-sm text-gray-500">
                  Максимальный размер: 10MB. Поддерживаемые форматы: изображения, PDF, документы, таблицы
                </p>
              </div>
            )}
          </div>

          {/* Скрытый input для выбора файла */}
          <Input
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />

          {!selectedFile && (
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById("file-input")?.click()}
              className="w-full"
            >
              Выбрать файл
            </Button>
          )}

          {/* Описание файла */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание (необязательно)</Label>
            <Textarea id="description" name="description" placeholder="Краткое описание файла..." rows={2} />
          </div>

          {selectedFile && (
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Загрузка..." : "Загрузить файл"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
