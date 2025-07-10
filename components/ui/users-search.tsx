"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Search, Shield, Crown, User, Eye } from "lucide-react"

const roleIcons = {
  admin: Shield,
  project_manager: Crown,
  executor: User,
  observer: Eye,
}

const roleLabels = {
  admin: "Администратор",
  project_manager: "Руководитель проекта",
  executor: "Исполнитель",
  observer: "Наблюдатель",
}

const roleColors = {
  admin: "bg-red-100 text-red-800",
  project_manager: "bg-purple-100 text-purple-800",
  executor: "bg-blue-100 text-blue-800",
  observer: "bg-gray-100 text-gray-800",
}

interface UserWithStats {
  id: string
  name: string
  email: string
  role: string
  department: string | null
  createdAt: string | null
  stats: {
    projects: number
    tasks: number
    completedTasks: number
  }
}

interface UsersSearchProps {
  users: UserWithStats[]
}

export function UsersSearch({ users }: UsersSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")

  // Фильтруем пользователей на основе поискового запроса
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return users
    }

    const query = searchQuery.toLowerCase()

    return users.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.department && user.department.toLowerCase().includes(query))
    )
  }, [users, searchQuery])

  return (
    <div className="space-y-6">
      {/* Поиск */}
      <Card>
        <CardHeader>
          <CardTitle>Поиск пользователей</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Поиск по имени, email или отделу..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-600 mt-2">
              Найдено пользователей: {filteredUsers.length} из {users.length}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Список пользователей */}
      <Card>
        <CardHeader>
          <CardTitle>Список пользователей</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                {searchQuery ? "Пользователи не найдены" : "Нет пользователей для отображения"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((u) => {
                const RoleIcon = roleIcons[u.role as keyof typeof roleIcons] || User

                return (
                  <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="text-lg">{u.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{u.name}</h3>
                          <Badge className={roleColors[u.role as keyof typeof roleColors]}>
                            <RoleIcon className="w-3 h-3 mr-1" />
                            {roleLabels[u.role as keyof typeof roleLabels]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">{u.email}</p>
                        {u.department && <p className="text-xs text-gray-500">{u.department}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="text-center">
                        <div className="font-medium">{u.stats.projects}</div>
                        <div className="text-xs">Проектов</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">{u.stats.tasks}</div>
                        <div className="text-xs">Задач</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-green-600">{u.stats.completedTasks}</div>
                        <div className="text-xs">Завершено</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("ru-RU") : "Н/Д"}
                        </div>
                        <div className="text-xs">Регистрация</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
