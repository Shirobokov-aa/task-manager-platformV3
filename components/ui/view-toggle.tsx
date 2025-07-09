"use client"

import { Button } from "@/components/ui/button"
import { LayoutGrid, Table2, Columns3 } from "lucide-react"

export type ViewType = "cards" | "kanban" | "table"

interface ViewToggleProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
      <Button
        variant={currentView === "cards" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("cards")}
        className="h-8 px-3"
      >
        <LayoutGrid className="w-4 h-4 mr-1" />
        Карточки
      </Button>

      <Button
        variant={currentView === "kanban" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("kanban")}
        className="h-8 px-3"
      >
        <Columns3 className="w-4 h-4 mr-1" />
        Канбан
      </Button>

      <Button
        variant={currentView === "table" ? "default" : "ghost"}
        size="sm"
        onClick={() => onViewChange("table")}
        className="h-8 px-3"
      >
        <Table2 className="w-4 h-4 mr-1" />
        Таблица
      </Button>
    </div>
  )
}
