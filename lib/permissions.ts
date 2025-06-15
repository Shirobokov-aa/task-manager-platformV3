import type { User, Project, Task } from "@/lib/db/schema"

export type UserRole = "admin" | "project_manager" | "executor" | "observer"

export function canCreateProject(user: User): boolean {
  return user.role === "admin" || user.role === "project_manager"
}

export function canEditProject(user: User, project: Project): boolean {
  return user.role === "admin" || project.ownerId === user.id
}

export function canCreateTask(user: User, projectId: string, projectOwnerId: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id || user.role === "project_manager"
}

export function canEditTask(user: User, task: Task, projectOwnerId: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id || task.assigneeId === user.id
}

export function canChangeTaskStatus(user: User, task: Task, projectOwnerId: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id || task.assigneeId === user.id
}

export function canDeleteComment(user: User, commentAuthorId: string, projectOwnerId: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id || commentAuthorId === user.id
}

export function canViewAuditLogs(user: User, projectOwnerId: string): boolean {
  return user.role === "admin" || projectOwnerId === user.id
}
