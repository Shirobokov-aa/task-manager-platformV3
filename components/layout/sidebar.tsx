"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, FolderOpen, CheckSquare, Users, Settings, FileText, BarChart3 } from "lucide-react"

const navigation = [
  { name: "Главная", href: "/", icon: Home },
  { name: "Проекты", href: "/projects", icon: FolderOpen },
  { name: "Мои задачи", href: "/tasks", icon: CheckSquare },
  { name: "Пользователи", href: "/users", icon: Users },
  { name: "Аудит", href: "/audit", icon: FileText },
  { name: "Отчеты", href: "/reports", icon: BarChart3 },
  { name: "Настройки", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white shadow-sm border-r">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900">Задачник</h1>
      </div>
      <nav className="px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              )}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
