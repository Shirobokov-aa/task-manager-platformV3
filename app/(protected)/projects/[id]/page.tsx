import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { projects, tasks, users, projectMembers, files } from "@/lib/db/schema"
import { eq, desc, and, sql } from "drizzle-orm"
import { TaskCard } from "@/components/ui/task-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, FileText, Settings } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { FileUploadForm } from "@/components/forms/file-upload-form"

interface ProjectPageProps {
  params: { id: string }
}

interface ProjectData {
  id: string
  title: string
  description: string | null
  ownerId: string
  createdAt: string | null
  owner: {
    name: string
    email: string
  }
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
  assignee: {
    name: string | null
    email: string | null
  } | null
  creator: {
    name: string
    email: string
  }
}

interface MemberData {
  id: string
  role: string
  addedAt: string | null
  user: {
    id: string
    name: string
    email: string
    department: string | null
  }
}

interface FileData {
  id: string
  filename: string
  originalName: string
  fileSize: number
  mimeType: string
  description: string | null
  uploadedAt: string | null
  uploader: {
    name: string
    email: string
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Получаем проект с участниками
  const [project] = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      ownerId: projects.ownerId,
      createdAt: projects.createdAt,
      owner: {
        name: users.name,
        email: users.email,
      },
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(eq(projects.id, params.id))
    .limit(1) as ProjectData[]

  if (!project) {
    notFound()
  }

  // Проверяем, является ли пользователь участником проекта
  const [membership] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, params.id),
        eq(projectMembers.userId, user.id)
      )
    )
    .limit(1)

  if (!membership && user.role !== "admin") {
    notFound()
  }

  // Получаем задачи проекта
  const projectTasks = await db
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
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.projectId, params.id))
    .orderBy(desc(tasks.createdAt)) as TaskData[]

  // Получаем участников проекта
  const members = await db
    .select({
      id: projectMembers.id,
      role: projectMembers.role,
      addedAt: projectMembers.addedAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        department: users.department,
      },
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, params.id)) as MemberData[]

  // Получаем файлы проекта
  const projectFiles = await db
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
    .where(eq(files.projectId, params.id))
    .orderBy(desc(files.uploadedAt)) as FileData[]

  const canManageProject = project.ownerId === user.id || user.role === "admin"

  return (
    <div className="space-y-6">
      {/* Заголовок проекта */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
          {project.description && <p className="text-gray-600 mt-2 max-w-3xl">{project.description}</p>}
          <div className="flex items-center gap-4 mt-4">
            <Badge variant="outline">Владелец: {project.owner.name}</Badge>
            <Badge variant="outline">{members.length} участников</Badge>
            <Badge variant="outline">{projectTasks.length} задач</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${params.id}/tasks/new`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Новая задача
            </Button>
          </Link>
          {canManageProject && (
            <Link href={`/projects/${params.id}/settings`}>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Настройки
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Основной контент */}
        <div className="lg:col-span-3 space-y-6">
          {/* Задачи */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Задачи проекта
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projectTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">В проекте пока нет задач</p>
                  <Link href={`/projects/${params.id}/tasks/new`}>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Создать первую задачу
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {projectTasks.map((task) => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Файлы проекта */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Файлы проекта
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploadForm projectId={params.id} />

              {projectFiles.length === 0 ? (
                <p className="text-gray-600 text-center py-4">Файлы не загружены</p>
              ) : (
                <div className="space-y-2">
                  {projectFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{file.originalName}</p>
                        <p className="text-sm text-gray-600">
                          {file.uploader.name} • {file.uploadedAt ? new Date(file.uploadedAt).toLocaleDateString("ru-RU") : 'Дата не указана'} •{" "}
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
        </div>

        {/* Боковая панель */}
        <div className="space-y-6">
          {/* Участники */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Участники
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{member.user.name}</p>
                      <p className="text-sm text-gray-600">{member.user.department}</p>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                ))}
              </div>
              {canManageProject && (
                <Button variant="outline" className="w-full mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить участника
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
