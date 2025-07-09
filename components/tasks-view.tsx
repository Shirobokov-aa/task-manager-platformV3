"use client"

import { useState } from "react"
import { TaskCard } from "@/components/ui/task-card"
import { TaskSearchForm } from "@/components/ui/task-search-form"
import { KanbanBoard } from "@/components/ui/kanban-board"
import { TasksTable } from "@/components/ui/tasks-table"
import { ViewToggle, type ViewType } from "@/components/ui/view-toggle"

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

interface TasksViewProps {
  tasks: Task[]
  searchParams: {
    search?: string
    status?: string
    priority?: string
    view?: string
  }
}

export function TasksView({ tasks, searchParams }: TasksViewProps) {
  const [currentView, setCurrentView] = useState<ViewType>(
    (searchParams.view as ViewType) || "cards"
  )

  const renderTasksContent = () => {
    if (tasks.length === 0) {
      return (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Задач не найдено</h3>
          <p className="text-gray-600">Попробуйте изменить фильтры или создать новую задачу</p>
        </div>
      )
    }

    switch (currentView) {
      case "cards":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )

      case "kanban":
        return <KanbanBoard tasks={tasks} />

      case "table":
        return <TasksTable tasks={tasks} />

      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Мои задачи</h1>
        <p className="text-gray-600 mt-2">Управляйте своими задачами и отслеживайте прогресс</p>
      </div>

      {/* Фильтры и переключатель видов */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <TaskSearchForm
            initialSearch={searchParams.search}
            initialStatus={searchParams.status}
            initialPriority={searchParams.priority}
          />
        </div>
        <div className="flex-shrink-0">
          <ViewToggle
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        </div>
      </div>

      {/* Контент задач */}
      <div className={currentView === "table" ? "overflow-x-auto" : ""}>
        {renderTasksContent()}
      </div>
    </div>
  )
}
