import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Settings, User, Bell, Shield, Database } from "lucide-react"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as any

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-gray-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
          <p className="text-gray-600">Управление настройками системы и профиля</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Навигация */}
        <div className="space-y-2">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                <a href="#profile" className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 text-blue-700">
                  <User className="h-4 w-4" />
                  Профиль
                </a>
                <a href="#notifications" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <Bell className="h-4 w-4" />
                  Уведомления
                </a>
                {user.role === "admin" && (
                  <>
                    <a href="#security" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                      <Shield className="h-4 w-4" />
                      Безопасность
                    </a>
                    <a href="#system" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                      <Database className="h-4 w-4" />
                      Система
                    </a>
                  </>
                )}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Основной контент */}
        <div className="lg:col-span-2 space-y-6">
          {/* Настройки профиля */}
          <Card id="profile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Настройки профиля
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input id="name" defaultValue={user.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user.email} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Отдел</Label>
                <Input id="department" defaultValue={user.department || ""} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">О себе</Label>
                <Textarea id="bio" placeholder="Расскажите о себе..." rows={3} />
              </div>

              <Button>Сохранить изменения</Button>
            </CardContent>
          </Card>

          {/* Уведомления */}
          <Card id="notifications">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Уведомления
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email уведомления</p>
                    <p className="text-sm text-gray-600">Получать уведомления на email</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Новые задачи</p>
                    <p className="text-sm text-gray-600">Уведомления о назначенных задачах</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Комментарии</p>
                    <p className="text-sm text-gray-600">Уведомления о новых комментариях</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Сроки задач</p>
                    <p className="text-sm text-gray-600">Напоминания о приближающихся сроках</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Button>Сохранить настройки</Button>
            </CardContent>
          </Card>

          {/* Настройки безопасности (только для админов) */}
          {user.role === "admin" && (
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
                    <h4 className="font-medium mb-2">Смена пароля</h4>
                    <div className="space-y-3">
                      <Input type="password" placeholder="Текущий пароль" />
                      <Input type="password" placeholder="Новый пароль" />
                      <Input type="password" placeholder="Подтвердите новый пароль" />
                      <Button size="sm">Изменить пароль</Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Двухфакторная аутентификация</p>
                        <p className="text-sm text-gray-600">Дополнительная защита аккаунта</p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Логирование входов</p>
                        <p className="text-sm text-gray-600">Записывать все попытки входа</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Button>Сохранить настройки</Button>
              </CardContent>
            </Card>
          )}

          {/* Системные настройки (только для админов) */}
          {user.role === "admin" && (
            <Card id="system">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Системные настройки
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Общие настройки</h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="site-name">Название системы</Label>
                        <Input id="site-name" defaultValue="Задачник" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="max-file-size">Максимальный размер файла (МБ)</Label>
                        <Input id="max-file-size" type="number" defaultValue="10" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Email настройки</h4>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="smtp-host">SMTP сервер</Label>
                        <Input id="smtp-host" placeholder="smtp.example.com" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="smtp-port">Порт</Label>
                          <Input id="smtp-port" type="number" defaultValue="587" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="smtp-user">Пользователь</Label>
                          <Input id="smtp-user" placeholder="user@example.com" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Регистрация новых пользователей</p>
                        <p className="text-sm text-gray-600">Разрешить самостоятельную регистрацию</p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Автоматическое резервное копирование</p>
                        <p className="text-sm text-gray-600">Ежедневное создание бэкапов</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <Button>Сохранить настройки</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
