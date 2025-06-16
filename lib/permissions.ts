import type { User, Project, Task } from "@/lib/db/schema"

export type UserRole = "admin" | "project_manager" | "executor" | "observer"
export type ProjectRole = "project_manager" | "executor" | "observer"

// Системные права
export function canCreateProject(user: User): boolean {
  return user.role === "admin" || user.role === "project_manager"
}

export function canEditProject(user: User, project: Project): boolean {
  return user.role === "admin" || project.ownerId === user.id
}

export function canDeleteProject(user: User, project: Project): boolean {
  return user.role === "admin" || project.ownerId === user.id
}

// Права на задачи
export function canCreateTask(user: User, projectOwnerId: string, userProjectRole?: string): boolean {
  return (
    user.role === "admin" ||
    projectOwnerId === user.id ||
    userProjectRole === "project_manager" ||
    user.role === "project_manager"
  )
}

export function canEditTask(user: User, task: Task, projectOwnerId: string, userProjectRole?: string): boolean {
  return (
    user.role === "admin" ||
    projectOwnerId === user.id ||
    task.assigneeId === user.id ||
    task.creatorId === user.id ||
    userProjectRole === "project_manager"
  )
}

export function canChangeTaskStatus(user: User, task: Task, projectOwnerId: string, userProjectRole?: string): boolean {
  return (
    user.role === "admin" ||
    projectOwnerId === user.id ||
    task.assigneeId === user.id ||
    userProjectRole === "project_manager"
  )
}

export function canAssignTask(user: User, projectOwnerId: string, userProjectRole?: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id || userProjectRole === "project_manager"
}

// Права на комментарии
export function canCreateComment(user: User, userProjectRole?: string): boolean {
  return userProjectRole !== undefined // Любой участник проекта может комментировать
}

export function canEditComment(user: User, commentAuthorId: string, projectOwnerId: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id || commentAuthorId === user.id
}

export function canDeleteComment(user: User, commentAuthorId: string, projectOwnerId: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id || commentAuthorId === user.id
}

// Права на файлы
export function canUploadFile(user: User, userProjectRole?: string): boolean {
  return userProjectRole !== undefined // Любой участник проекта может загружать файлы
}

export function canDeleteFile(user: User, fileUploaderId: string, projectOwnerId: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id || fileUploaderId === user.id
}

// Права на участников проекта
export function canManageProjectMembers(user: User, projectOwnerId: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id
}

export function canChangeProjectMemberRole(user: User, projectOwnerId: string, targetUserId: string): boolean {
  return user.role === "admin" || (projectOwnerId === user.id && targetUserId !== user.id)
}

// Права на просмотр
export function canViewProject(user: User, projectOwnerId: string, userProjectRole?: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id || userProjectRole !== undefined
}

export function canViewTask(user: User, task: Task, projectOwnerId: string, userProjectRole?: string): boolean {
  return canViewProject(user, projectOwnerId, userProjectRole)
}

export function canViewAuditLogs(user: User, projectOwnerId?: string): boolean {
  return user.role === "admin" || (projectOwnerId && projectOwnerId === user.id) || user.role === "project_manager"
}

export function canViewReports(user: User): boolean {
  return user.role === "admin" || user.role === "project_manager"
}

export function canManageUsers(user: User): boolean {
  return user.role === "admin"
}

export function canViewUsers(user: User): boolean {
  return user.role === "admin" || user.role === "project_manager"
}

// Права на системные настройки
export function canManageSystemSettings(user: User): boolean {
  return user.role === "admin"
}

export function canExportReports(user: User): boolean {
  return user.role === "admin" || user.role === "project_manager"
}

// Уведомления
export function shouldReceiveTaskNotification(user: User, task: Task): boolean {
  return task.assigneeId === user.id || task.creatorId === user.id
}

export function shouldReceiveCommentNotification(user: User, task: Task, commentAuthorId: string): boolean {
  return (task.assigneeId === user.id || task.creatorId === user.id) && commentAuthorId !== user.id
}
