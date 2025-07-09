"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, User, Flag, Zap, Clock, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Task {
  id: string
  title: string
  description: string | null
  projectId: string
  parentTaskId: string | null
  assigneeId: string | null
  creatorId: string
  status: string
  priority: string
  complexity: number
  dueDate: Date | null
  tags: string[] | null
  createdAt: Date | null
  updatedAt: Date | null
  project: {
    title: string
  }
  assignee: {
    name: string
    email: string
  } | null
  creator: {
    name: string
    email: string
  }
}

interface TasksTableProps {
  tasks: Task[]
}

type SortField = 'status' | 'priority' | 'assignee' | 'dueDate' | 'complexity' | 'tags' | 'createdAt'
type SortDirection = 'asc' | 'desc' | null

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
}

const priorityLabels = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  critical: "Критический",
}

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
}

const statusLabels = {
  open: "Открыто",
  in_progress: "В работе",
  completed: "Завершено",
  cancelled: "Отменено",
}

// Приоритеты для сортировки
const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
const statusOrder = { open: 1, in_progress: 2, completed: 3, cancelled: 4 }

function isOverdue(dueDate: Date | null): boolean {
  if (!dueDate) return false
  return new Date() > new Date(dueDate)
}

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
}

function getDaysUntilDue(dueDate: Date | null): number | null {
  if (!dueDate) return null
  const now = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

interface SortableHeaderProps {
  field: SortField
  currentSort: { field: SortField | null; direction: SortDirection }
  onSort: (field: SortField) => void
  children: React.ReactNode
  className?: string
}

function SortableHeader({ field, currentSort, onSort, children, className }: SortableHeaderProps) {
  const isActive = currentSort.field === field
  const direction = isActive ? currentSort.direction : null

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 font-semibold hover:bg-transparent"
        onClick={() => onSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive ? (
            direction === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )
          ) : (
            <ArrowUpDown className="w-4 h-4 opacity-50" />
          )}
        </div>
      </Button>
    </TableHead>
  )
}

export function TasksTable({ tasks }: TasksTableProps) {
  const [sort, setSort] = useState<{ field: SortField | null; direction: SortDirection }>({
    field: null,
    direction: null
  })

  const handleSort = (field: SortField) => {
    if (sort.field === field) {
      if (sort.direction === 'asc') {
        setSort({ field, direction: 'desc' })
      } else if (sort.direction === 'desc') {
        setSort({ field: null, direction: null })
      } else {
        setSort({ field, direction: 'asc' })
      }
    } else {
      setSort({ field, direction: 'asc' })
    }
  }

  const sortedTasks = useMemo(() => {
    if (!sort.field || !sort.direction) {
      return tasks
    }

    return [...tasks].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sort.field) {
        case 'status':
          aValue = statusOrder[a.status as keyof typeof statusOrder]
          bValue = statusOrder[b.status as keyof typeof statusOrder]
          break

        case 'priority':
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder]
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder]
          break

        case 'assignee':
          aValue = a.assignee?.name || 'zzz' // Неназначенные в конце
          bValue = b.assignee?.name || 'zzz'
          break

        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER
          break

        case 'complexity':
          aValue = a.complexity
          bValue = b.complexity
          break

        case 'tags':
          aValue = a.tags?.length || 0
          bValue = b.tags?.length || 0
          break

        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
          break

        default:
          return 0
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'ru')
        return sort.direction === 'asc' ? comparison : -comparison
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [tasks, sort])

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Задач не найдено</h3>
        <p className="text-gray-600">Попробуйте изменить фильтры или создать новую задачу</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Задача</TableHead>
              <TableHead className="w-[150px]">Проект</TableHead>
              <SortableHeader
                field="status"
                currentSort={sort}
                onSort={handleSort}
                className="w-[120px]"
              >
                Статус
              </SortableHeader>
              <SortableHeader
                field="priority"
                currentSort={sort}
                onSort={handleSort}
                className="w-[120px]"
              >
                Приоритет
              </SortableHeader>
              <SortableHeader
                field="assignee"
                currentSort={sort}
                onSort={handleSort}
                className="w-[150px]"
              >
                Исполнитель
              </SortableHeader>
              <SortableHeader
                field="dueDate"
                currentSort={sort}
                onSort={handleSort}
                className="w-[120px]"
              >
                Срок
              </SortableHeader>
              <SortableHeader
                field="complexity"
                currentSort={sort}
                onSort={handleSort}
                className="w-[80px] text-center"
              >
                Сложность
              </SortableHeader>
              <SortableHeader
                field="tags"
                currentSort={sort}
                onSort={handleSort}
                className="w-[200px]"
              >
                Теги
              </SortableHeader>
              <SortableHeader
                field="createdAt"
                currentSort={sort}
                onSort={handleSort}
                className="w-[100px]"
              >
                Создано
              </SortableHeader>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
              const overdue = isOverdue(task.dueDate)
              const daysUntilDue = getDaysUntilDue(task.dueDate)

              return (
                <TableRow key={task.id} className="hover:bg-muted/50">
                  {/* Название задачи */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm line-clamp-2">
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Проект */}
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {task.project.title}
                    </div>
                  </TableCell>

                  {/* Статус */}
                  <TableCell>
                    <Badge className={statusColors[task.status as keyof typeof statusColors]} variant="secondary">
                      {statusLabels[task.status as keyof typeof statusLabels]}
                    </Badge>
                  </TableCell>

                  {/* Приоритет */}
                  <TableCell>
                    <Badge className={priorityColors[task.priority as keyof typeof priorityColors]} variant="secondary">
                      <Flag className="w-3 h-3 mr-1" />
                      {priorityLabels[task.priority as keyof typeof priorityLabels]}
                    </Badge>
                  </TableCell>

                  {/* Исполнитель */}
                  <TableCell>
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">
                            {task.assignee.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm">{task.assignee.name}</div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Не назначен</div>
                    )}
                  </TableCell>

                  {/* Срок выполнения */}
                  <TableCell>
                    {task.dueDate ? (
                      <div className="space-y-1">
                        <div className={`text-sm flex items-center gap-1 ${overdue ? 'text-red-600' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          {formatDate(task.dueDate)}
                          {overdue && <Clock className="w-3 h-3" />}
                        </div>
                        {daysUntilDue !== null && (
                          <div className={`text-xs ${
                            daysUntilDue < 0
                              ? 'text-red-600'
                              : daysUntilDue <= 3
                                ? 'text-orange-600'
                                : 'text-muted-foreground'
                          }`}>
                            {daysUntilDue < 0
                              ? `Просрочено на ${Math.abs(daysUntilDue)} дн.`
                              : daysUntilDue === 0
                                ? 'Сегодня'
                                : daysUntilDue === 1
                                  ? 'Завтра'
                                  : `${daysUntilDue} дн.`
                            }
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">—</div>
                    )}
                  </TableCell>

                  {/* Сложность */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span className="text-sm font-medium">{task.complexity}</span>
                    </div>
                  </TableCell>

                  {/* Теги */}
                  <TableCell>
                    {task.tags && task.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {task.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            +{task.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">—</div>
                    )}
                  </TableCell>

                  {/* Дата создания */}
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(task.createdAt)}
                    </div>
                  </TableCell>

                  {/* Действия */}
                  <TableCell>
                    <Link href={`/tasks/${task.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <ExternalLink className="w-4 h-4" />
                        <span className="sr-only">Открыть задачу</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
