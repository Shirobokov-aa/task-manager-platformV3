"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface TaskSearchFormProps {
  initialSearch?: string
  initialStatus?: string
  initialPriority?: string
}

export function TaskSearchForm({ initialSearch = "", initialStatus = "", initialPriority = "" }: TaskSearchFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState(initialStatus)
  const [priority, setPriority] = useState(initialPriority)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())

    if (search) {
      params.set("search", search)
    } else {
      params.delete("search")
    }

    if (status && status !== "all") {
      params.set("status", status)
    } else {
      params.delete("status")
    }

    if (priority && priority !== "all") {
      params.set("priority", priority)
    } else {
      params.delete("priority")
    }

    router.push(`/tasks?${params.toString()}`)
  }

  const handleReset = () => {
    setSearch("")
    setStatus("")
    setPriority("")
    router.push("/tasks")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Поиск и фильтры</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Поиск по названию..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="open">Открыта</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="completed">Завершена</SelectItem>
                <SelectItem value="cancelled">Отменена</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Приоритет" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все приоритеты</SelectItem>
                <SelectItem value="low">Низкий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="high">Высокий</SelectItem>
                <SelectItem value="critical">Критический</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Найти
              </Button>
              <Button type="button" variant="outline" onClick={handleReset}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
