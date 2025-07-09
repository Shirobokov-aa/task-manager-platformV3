import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { SettingsForm } from "@/components/settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, User, Shield } from "lucide-react"

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
                <a href="#security" className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <Shield className="h-4 w-4" />
                  Безопасность
                </a>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Основной контент */}
        <div className="lg:col-span-2">
          <SettingsForm user={user} />
        </div>
      </div>
    </div>
  )
}
