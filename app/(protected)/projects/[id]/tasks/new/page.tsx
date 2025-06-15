import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { projects, users, projectMembers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { CreateTaskForm } from "@/components/forms/create-task-form"
import { notFound } from "next/navigation"

interface NewTaskPageProps {
  params: { id: string }
}

export default async function NewTaskPage({ params }: NewTaskPageProps) {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  // Проверяем доступ к проекту
  const [project] = await db.select().from(projects).where(eq(projects.id, params.id)).limit(1)

  if (!project) {
    notFound()
  }

  // Получаем участников проекта для выбора исполнителя
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .innerJoin(projectMembers, eq(users.id, projectMembers.userId))
    .where(eq(projectMembers.projectId, params.id))

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Создать новую задачу</h1>
        <p className="text-gray-600">Проект: {project.title}</p>
      </div>
      <CreateTaskForm projectId={params.id} users={members} />
    </div>
  )
}
