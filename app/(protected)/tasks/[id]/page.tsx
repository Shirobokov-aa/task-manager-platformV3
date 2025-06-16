import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { tasks, users, comments, files, projects } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, User, Flag, Zap, MessageSquare, FileText, Edit } from "lucide-react"
import { TaskStatusForm } from "@/components/forms/task-status-form"
import { CommentForm } from "@/components/forms/comment-form"
import { CommentList } from "@/components/ui/comment-list"
import { notFound } from "next/navigation"
import Link from "next/link"
import { FileUploadForm } from "@/components/forms/file-upload-form"

interface TaskPageProps {
  params: { id: string }
}

interface TaskData {
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
  dueDate: string | null
  tags: string[]
  createdAt: string | null
  updatedAt: string | null
  project: {
    title: string
  }
  assignee: {
    name: string | null
    email: string | null
  } | null
  creator: {
    name: string
    email: string
  }
}

const priorityColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
}

const statusColors = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
}

export default async function TaskPage({ params }: TaskPageProps) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Получаем задачу
  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      projectId: tasks.projectId,
      parentTaskId: tasks.parentTaskId,
      assigneeId: tasks.assigneeId,
      creatorId: tasks.creatorId,
      status: tasks.status,
      priority: tasks.priority,
      complexity: tasks.complexity,
      dueDate: tasks.dueDate,
      tags: tasks.tags,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      project: {
        title: projects.title,
      },
      assignee: {
        name: users.name,
        email: users.email,
      },
      creator: {
        name: sql<string>`(SELECT name FROM ${users} WHERE id = ${tasks.creatorId})`,
        email: sql<string>`(SELECT email FROM ${users} WHERE id = ${tasks.creatorId})`,
      },
    })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.id, params.id))
    .limit(1) as TaskData[]

  if (!task) {
    notFound()
  }

  // Получаем комментарии
  const taskComments = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      author: {
        id: users.id,
        name: users.name,
        email: users.email,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.taskId, params.id))
    .orderBy(desc(comments.createdAt))

  // Получаем файлы задачи
  const taskFiles = await db
    .select({
      id: files.id,
      filename: files.filename,
      originalName: files.originalName,
      fileSize: files.fileSize,
      mimeType: files.mimeType,
      description: files.description,
      uploadedAt: files.uploadedAt,
      uploader: {
        name: users.name,
        email: users.email,
      },
    })
    .from(files)
    .innerJoin(users, eq(files.uploadedBy, users.id))
    .where(eq(files.taskId, params.id))
    .orderBy(desc(files.uploadedAt))

  // Получаем подзадачи
  const subtasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      assignee: {
        name: users.name,
      },
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.parentTaskId, params.id))

  const canEditTask = task.assigneeId === user.id || task.creatorId === user.id || user.role === "admin"

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Заголовок */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href={`/projects/${task.projectId}`} className="hover:underline">
              {task.project.title}
            </Link>
            <span>•</span>
            <span>Задача #{task.id.slice(0, 8)}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{task.title}</h1>
          <div className="flex items-center gap-4">
            <Badge className={priorityColors[task.priority as keyof typeof priorityColors]}>
              <Flag className="w-3 h-3 mr-1" />
              {task.priority}
            </Badge>
            <Badge className={statusColors[task.status as keyof typeof statusColors]}>{task.status}</Badge>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Zap className="w-4 h-4" />
              Сложность: {task.complexity}
            </div>
          </div>
        </div>
        {canEditTask && (
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Редактировать
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основной контент */}
        <div className="lg:col-span-2 space-y-6">
          {/* Описание */}
          <Card>
            <CardHeader>
              <CardTitle>Описание</CardTitle>
            </CardHeader>
            <CardContent>
              {task.description ? (
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{task.description}</p>
                </div>
              ) : (
                <p className="text-gray-600 italic">Описание не добавлено</p>
              )}
            </CardContent>
          </Card>

          {/* Подзадачи */}
          {subtasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Подзадачи ({subtasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subtasks.map((subtask) => (
                    <Link key={subtask.id} href={`/tasks/${subtask.id}`}>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Badge
                            className={statusColors[subtask.status as keyof typeof statusColors]}
                            variant="outline"
                          >
                            {subtask.status}
                          </Badge>
                          <span className="font-medium">{subtask.title}</span>
                        </div>
                        {subtask.assignee && <span className="text-sm text-gray-600">{subtask.assignee.name}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Файлы */}
          {taskFiles.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Файлы ({taskFiles.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FileUploadForm taskId={params.id} />

                {taskFiles.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">Файлы не загружены</p>
                ) : (
                  <div className="space-y-2">
                    {taskFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{file.originalName}</p>
                          <p className="text-sm text-gray-600">
                            {file.uploader.name} • {new Date(file.uploadedAt!).toLocaleDateString("ru-RU")} •{" "}
                            {Math.round(file.fileSize / 1024)} KB
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Скачать
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Комментарии */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Комментарии ({taskComments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CommentForm taskId={params.id} />
              <CommentList comments={taskComments} currentUserId={user.id} />
            </CardContent>
          </Card>
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Управление статусом */}
          {canEditTask && (
            <Card>
              <CardHeader>
                <CardTitle>Управление</CardTitle>
              </CardHeader>
              <CardContent>
                <TaskStatusForm taskId={params.id} currentStatus={task.status} />
              </CardContent>
            </Card>
          )}

          {/* Информация о задаче */}
          <Card>
            <CardHeader>
              <CardTitle>Информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.assignee && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Исполнитель</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">{task.assignee.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{task.assignee.name || 'Не назначен'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Создатель</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-xs">{task.creator.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{task.creator.name}</span>
                  </div>
                </div>
              </div>

              {task.dueDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Срок выполнения</p>
                    <p className="font-medium">{new Date(task.dueDate).toLocaleDateString("ru-RU")}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Создана</p>
                  <p className="font-medium">{new Date(task.createdAt!).toLocaleDateString("ru-RU")}</p>
                </div>
              </div>

              {task.tags && task.tags.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Теги</p>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
