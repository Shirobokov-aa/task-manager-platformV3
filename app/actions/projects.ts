"use server"

import { db } from "@/lib/db"
import { projects, projectMembers, auditLogs } from "@/lib/db/schema"
import { createProjectSchema } from "@/lib/validation/schemas"
import { canCreateProject, canEditProject } from "@/lib/permissions"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { sendProjectInviteNotification } from "./notifications"

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

export async function updateProject(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any
  const projectId = formData.get("projectId") as string

  const data = {
    title: formData.get("title") as string,
    description: formData.get("description") as string,
  }

  const validatedData = createProjectSchema.parse(data)

  // Проверяем права на проект
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project || !canEditProject(user, project)) {
    throw new Error("Недостаточно прав для редактирования проекта")
  }

  await db
    .update(projects)
    .set({
      ...validatedData,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))

  // Аудит
  await db.insert(auditLogs).values({
    action: "project_updated",
    entityType: "project",
    entityId: projectId,
    userId: user.id,
    projectId,
    details: { title: validatedData.title },
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/settings`)
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

  // Отправляем уведомление новому участнику
  await sendProjectInviteNotification(projectId, userId, role)

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
  revalidatePath(`/projects/${projectId}/settings`)
}

export async function removeMemberFromProject(projectId: string, memberId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  // Проверяем права на проект
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project || !canEditProject(user, project)) {
    throw new Error("Недостаточно прав для удаления участников")
  }

  await db.delete(projectMembers).where(eq(projectMembers.id, memberId))

  // Аудит
  await db.insert(auditLogs).values({
    action: "member_removed",
    entityType: "project",
    entityId: projectId,
    userId: user.id,
    projectId,
    details: { removedMemberId: memberId },
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/settings`)
}

export async function changeMemberRole(projectId: string, memberId: string, newRole: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  // Проверяем права на проект
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project || !canEditProject(user, project)) {
    throw new Error("Недостаточно прав для изменения ролей")
  }

  await db.update(projectMembers).set({ role: newRole }).where(eq(projectMembers.id, memberId))

  // Аудит
  await db.insert(auditLogs).values({
    action: "member_role_changed",
    entityType: "project",
    entityId: projectId,
    userId: user.id,
    projectId,
    details: { memberId, newRole },
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath(`/projects/${projectId}/settings`)
}

export async function deleteProject(projectId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  // Получаем информацию о проекте
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project) {
    throw new Error("Проект не найден")
  }

  // Проверяем права на удаление (только владелец проекта или админ)
  if (project.ownerId !== user.id && user.role !== "admin") {
    throw new Error("Недостаточно прав для удаления проекта")
  }

  // Аудит перед удалением
  await db.insert(auditLogs).values({
    action: "project_deleted",
    entityType: "project",
    entityId: projectId,
    userId: user.id,
    projectId,
    details: { title: project.title, ownerId: project.ownerId },
  })

  // Удаляем проект (каскадное удаление удалит связанные записи)
  await db.delete(projects).where(eq(projects.id, projectId))

  revalidatePath("/projects")
  revalidatePath(`/projects/${projectId}`)
}
