import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, User, Flag, Zap } from "lucide-react"
import type { Task } from "@/lib/db/schema"
import Link from "next/link"

interface TaskCardProps {
  task: Task & {
    assignee?: { name: string; email: string } | null
    creator: { name: string; email: string }
    _count?: { subtasks: number; comments: number }
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

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2">
            <CardTitle className="text-lg font-semibold line-clamp-2">{task.title}</CardTitle>
            <div className="flex gap-2">
              <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
                <Flag className="w-3 h-3 mr-1" />
                {priorityLabels[task.priority as keyof typeof priorityLabels]}
              </Badge>
              <Badge className={statusColors[task.status as keyof typeof statusColors]}>{statusLabels[task.status as keyof typeof statusLabels]}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {task.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{task.description}</p>}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {task.assignee && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-xs">{task.assignee.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{task.assignee.name}</span>
                </div>
              )}

              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(task.dueDate).toLocaleDateString("ru-RU")}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                <span>{task.complexity}</span>
              </div>
              {task._count && (
                <div className="flex gap-2 text-xs">
                  {task._count.subtasks > 0 && <span>{task._count.subtasks} подзадач</span>}
                  {task._count.comments > 0 && <span>{task._count.comments} комментариев</span>}
                </div>
              )}
            </div>
          </div>

          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {task.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
