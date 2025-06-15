"use server"

import { db } from "@/lib/db"
import { projects, projectMembers, auditLogs } from "@/lib/db/schema"
import { createProjectSchema } from "@/lib/validation/schemas"
import { canCreateProject, canEditProject } from "@/lib/permissions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function createProject(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any
  if (!canCreateProject(user)) {
    throw new Error("Недостаточно прав для создания проекта")
  }

  const data = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
  }

  const validatedData = createProjectSchema.parse(data)

  const [project] = await db
    .insert(projects)
    .values({
      ...validatedData,
      ownerId: user.id,
    })
    .returning()

  // Добавляем владельца как участника проекта
  await db.insert(projectMembers).values({
    projectId: project.id,
    userId: user.id,
    role: "project_manager",
  })

  // Аудит
  await db.insert(auditLogs).values({
    action: "project_created",
    entityType: "project",
    entityId: project.id,
    userId: user.id,
    projectId: project.id,
    details: { title: project.title },
  })

  revalidatePath("/projects")
  return project
}

export async function addProjectMember(projectId: string, userId: string, role: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  // Проверяем права на проект
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project || !canEditProject(user, project)) {
    throw new Error("Недостаточно прав для добавления участников")
  }

  await db.insert(projectMembers).values({
    projectId,
    userId,
    role,
  })

  // Аудит
  await db.insert(auditLogs).values({
    action: "member_added",
    entityType: "project",
    entityId: projectId,
    userId: user.id,
    projectId,
    details: { addedUserId: userId, role },
  })

  revalidatePath(`/projects/${projectId}`)
}
