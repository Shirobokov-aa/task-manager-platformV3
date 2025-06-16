"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createUser } from "@/app/actions/users"
import { toast } from "sonner"
import { UserPlus, Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"

interface CreateUserFormProps {}

export function CreateUserForm({}: CreateUserFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState("executor")
  const router = useRouter()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    try {
      formData.append("role", role)
      await createUser(formData)
      toast.success("Пользователь успешно создан")

      // Очищаем форму
      const form = document.getElementById("create-user-form") as HTMLFormElement
      form?.reset()
      setRole("executor")

      // Обновляем страницу
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка создания пользователя")
    } finally {
      setIsLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const passwordInput = document.getElementById("password") as HTMLInputElement
    if (passwordInput) {
      passwordInput.value = password
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Создать нового пользователя
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form id="create-user-form" action={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Полное имя</Label>
              <Input id="name" name="name" placeholder="Иван Иванов" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="ivan@company.com" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Введите пароль"
                required
                minLength={6}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={generatePassword}>
                  Генерировать
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-600">Минимум 6 символов. Пароль будет отправлен пользователю на email.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Роль в системе</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="project_manager">Руководитель проекта</SelectItem>
                  <SelectItem value="executor">Исполнитель</SelectItem>
                  <SelectItem value="observer">Наблюдатель</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Отдел</Label>
              <Input id="department" name="department" placeholder="IT, Разработка, QA..." />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Описание ролей:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                <strong>Администратор:</strong> Полный доступ ко всем функциям системы
              </li>
              <li>
                <strong>Руководитель проекта:</strong> Создание проектов, управление участниками
              </li>
              <li>
                <strong>Исполнитель:</strong> Работа с назначенными задачами
              </li>
              <li>
                <strong>Наблюдатель:</strong> Только просмотр проектов и задач
              </li>
            </ul>
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Создание..." : "Создать пользователя"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
