import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, User, Flag, Zap, Clock } from "lucide-react"
import Link from "next/link"

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

interface KanbanBoardProps {
  tasks: Task[]
}

const statusConfig = {
  open: {
    title: "Открыто",
    color: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-800",
    count: 0
  },
  in_progress: {
    title: "В работе",
    color: "bg-purple-50 border-purple-200",
    badgeColor: "bg-purple-100 text-purple-800",
    count: 0
  },
  completed: {
    title: "Завершено",
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-800",
    count: 0
  },
  cancelled: {
    title: "Отменено",
    color: "bg-gray-50 border-gray-200",
    badgeColor: "bg-gray-100 text-gray-800",
    count: 0
  }
}

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

function isOverdue(dueDate: Date | null): boolean {
  if (!dueDate) return false
  return new Date() > new Date(dueDate)
}

function TaskKanbanCard({ task }: { task: Task }) {
  const overdue = isOverdue(task.dueDate)

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer mb-3 bg-white">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
              {task.title}
            </CardTitle>
            <Badge className={priorityColors[task.priority as keyof typeof priorityColors]} variant="secondary">
              <Flag className="w-3 h-3 mr-1" />
              {priorityLabels[task.priority as keyof typeof priorityLabels]}
            </Badge>
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {task.description}
            </p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {/* Проект */}
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Проект:</span> {task.project.title}
            </div>

            {/* Исполнитель */}
            {task.assignee && (
              <div className="flex items-center gap-2 text-xs">
                <User className="w-3 h-3" />
                <Avatar className="w-5 h-5">
                  <AvatarFallback className="text-xs">
                    {task.assignee.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground">{task.assignee.name}</span>
              </div>
            )}

            {/* Дата и сложность */}
            <div className="flex items-center justify-between text-xs">
              {task.dueDate && (
                <div className={`flex items-center gap-1 ${overdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(task.dueDate).toLocaleDateString("ru-RU")}</span>
                  {overdue && <Clock className="w-3 h-3 text-red-600" />}
                </div>
              )}

              <div className="flex items-center gap-1 text-muted-foreground">
                <Zap className="w-3 h-3" />
                <span>{task.complexity}</span>
              </div>
            </div>

            {/* Теги */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.slice(0, 3).map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs px-1 py-0">
                    {tag}
                  </Badge>
                ))}
                {task.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    +{task.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function KanbanBoard({ tasks }: KanbanBoardProps) {
  // Группируем задачи по статусам
  const groupedTasks = tasks.reduce((acc, task) => {
    const status = task.status
    if (!acc[status]) {
      acc[status] = []
    }
    acc[status].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  // Подсчитываем количество задач в каждом статусе
  const statusCounts = Object.keys(statusConfig).reduce((acc, status) => {
    acc[status] = groupedTasks[status]?.length || 0
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full max-h-[850px]">
        {Object.entries(statusConfig).map(([status, config]) => {
          const statusTasks = groupedTasks[status] || []

          return (
            <div key={status} className={`${config.color} border rounded-lg p-4`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{config.title}</h3>
                <Badge variant="secondary" className={config.badgeColor}>
                  {statusCounts[status]}
                </Badge>
              </div>

              <div className="space-y-2 max-h-[800px] h-full overflow-y-auto">
                {statusTasks.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Нет задач
                  </div>
                ) : (
                  statusTasks.map((task) => (
                    <TaskKanbanCard key={task.id} task={task} />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
