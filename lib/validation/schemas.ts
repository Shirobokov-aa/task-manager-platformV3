import { z } from "zod"

export const createProjectSchema = z.object({
  title: z.string().min(1, "Название проекта обязательно").max(255),
  description: z.string().optional(),
})

export const createTaskSchema = z.object({
  title: z.string().min(1, "Название задачи обязательно").max(255),
  description: z.string().optional(),
  projectId: z.string().uuid(),
  parentTaskId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  complexity: z.number().min(1).max(10).default(1),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

export const updateTaskStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]),
})

export const createCommentSchema = z.object({
  content: z.string().min(1, "Комментарий не может быть пустым"),
  taskId: z.string().uuid(),
})

export const uploadFileSchema = z.object({
  projectId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  description: z.string().optional(),
})
