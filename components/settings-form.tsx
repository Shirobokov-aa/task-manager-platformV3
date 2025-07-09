"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { User, Shield, Eye, EyeOff } from "lucide-react"
import { changePassword, updateProfile } from "@/app/actions/users"
import { toast } from "sonner"

interface SettingsFormProps {
  user: {
    id: string
    name: string
    email: string
    role: string
    department?: string
  }
}

export function SettingsForm({ user }: SettingsFormProps) {
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState(user)
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const profileFormRef = useRef<HTMLFormElement>(null)

    const handleProfileUpdate = async (formData: FormData) => {
    setIsProfileLoading(true)
    try {
      const result = await updateProfile(formData)
      toast.success(result.message)

      // Обновляем локальное состояние пользователя
      if (result.updatedUser) {
        setCurrentUser(prev => ({
          ...prev,
          name: result.updatedUser.name,
          email: result.updatedUser.email,
          department: result.updatedUser.department || undefined
        }))
      }

      // Показываем уведомление об успешном обновлении
      toast.success("Данные профиля обновлены. Изменения будут применены при следующем входе в систему.", {
        duration: 5000
      })

    } catch (error) {
      if (error instanceof Error) {
        // Обработка различных типов ошибок
        if (error.message.includes("email")) {
          toast.error("Ошибка: " + error.message)
        } else if (error.message.includes("Имя обязательно")) {
          toast.error("Пожалуйста, введите ваше имя")
        } else if (error.message.includes("Некорректный email")) {
          toast.error("Пожалуйста, введите корректный email адрес")
        } else {
          toast.error(error.message)
        }
      } else {
        toast.error("Произошла неизвестная ошибка при обновлении профиля")
      }
    } finally {
      setIsProfileLoading(false)
    }
  }

  const handlePasswordChange = async (formData: FormData) => {
    setIsPasswordLoading(true)
    try {
      const result = await changePassword(formData)
      toast.success(result.message)
      // Очищаем форму после успешной смены пароля
      const form = document.getElementById('password-form') as HTMLFormElement
      if (form) form.reset()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка смены пароля")
    } finally {
      setIsPasswordLoading(false)
    }
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Настройки профиля */}
      <Card id="profile">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Настройки профиля
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={profileFormRef} action={handleProfileUpdate} className="space-y-4" key={currentUser.email}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Имя <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={currentUser.name}
                  required
                  maxLength={255}
                  placeholder="Введите ваше имя"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={currentUser.email}
                  required
                  maxLength={255}
                  placeholder="example@company.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Отдел</Label>
              <Input
                id="department"
                name="department"
                defaultValue={currentUser.department || ""}
                maxLength={255}
                placeholder="Название вашего отдела (необязательно)"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              <p><span className="text-red-500">*</span> - обязательные поля</p>
            </div>

            <Button type="submit" disabled={isProfileLoading}>
              {isProfileLoading ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Настройки безопасности */}
      <Card id="security">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Безопасность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-4">Смена пароля</h4>
              <form id="password-form" action={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Текущий пароль</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      name="currentPassword"
                      type={showPasswords.current ? "text" : "password"}
                      placeholder="Введите текущий пароль"
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('current')}
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Новый пароль</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type={showPasswords.new ? "text" : "password"}
                      placeholder="Введите новый пароль (минимум 6 символов)"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('new')}
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPasswords.confirm ? "text" : "password"}
                      placeholder="Повторите новый пароль"
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => togglePasswordVisibility('confirm')}
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button type="submit" disabled={isPasswordLoading}>
                  {isPasswordLoading ? "Изменение..." : "Изменить пароль"}
                </Button>
              </form>
            </div>
            <Separator />

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Требования к паролю:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Минимум 6 символов</li>
                <li>Должен отличаться от текущего пароля</li>
                <li>Рекомендуется использовать буквы, цифры и специальные символы</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Информация о роли */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Информация о роли
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Текущая роль:</span>
              <span className="text-sm capitalize">{currentUser.role}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Для изменения роли обратитесь к администратору системы.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
