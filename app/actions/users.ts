"use server"

import { db } from "@/lib/db"
import { users, auditLogs } from "@/lib/db/schema"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { canManageUsers } from "@/lib/permissions"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { sendEmail } from "@/lib/email"
import { eq } from "drizzle-orm"

const createUserSchema = z.object({
  name: z.string().min(1, "Имя обязательно").max(255),
  email: z.string().email("Некорректный email").max(255),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
  role: z.enum(["admin", "project_manager", "executor", "observer"]),
  department: z.string().optional(),
})

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any
  if (!canManageUsers(user)) {
    throw new Error("Недостаточно прав для создания пользователей")
  }

  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
    department: formData.get("department") as string,
  }

  const validatedData = createUserSchema.parse(data)

  // Проверяем, не существует ли пользователь с таким email
  const existingUser = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1)
  if (existingUser.length > 0) {
    throw new Error("Пользователь с таким email уже существует")
  }

  // Хешируем пароль
  const passwordHash = await bcrypt.hash(validatedData.password, 12)

  // Создаем пользователя
  const [newUser] = await db
    .insert(users)
    .values({
      name: validatedData.name,
      email: validatedData.email,
      passwordHash,
      role: validatedData.role,
      department: validatedData.department || null,
    })
    .returning()

  // Отправляем приветственное письмо
  try {
    const emailContent = `
      <h2>Добро пожаловать в Задачник!</h2>
      <p>Здравствуйте, ${newUser.name}!</p>
      <p>Для вас был создан аккаунт в системе управления задачами.</p>

      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Email:</strong> ${newUser.email}</p>
        <p><strong>Пароль:</strong> ${validatedData.password}</p>
        <p><strong>Роль:</strong> ${validatedData.role}</p>
      </div>

      <p><strong>Важно:</strong> Рекомендуем сменить пароль после первого входа в систему.</p>
      <p>Войдите в систему по адресу: ${process.env.NEXTAUTH_URL}</p>

      <p>С уважением,<br>Команда Задачника</p>
    `

    await sendEmail({
      to: newUser.email,
      subject: "Добро пожаловать в Задачник!",
      html: emailContent,
    })
  } catch (error) {
    console.error("Ошибка отправки приветственного письма:", error)
  }

  // Аудит
  await db.insert(auditLogs).values({
    action: "user_created",
    entityType: "user",
    entityId: newUser.id,
    userId: user.id,
    details: {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
  })

  revalidatePath("/users")
  return newUser
}

export async function updateUserRole(userId: string, newRole: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any
  if (!canManageUsers(user)) {
    throw new Error("Недостаточно прав для изменения ролей пользователей")
  }

  // Нельзя изменить роль самому себе
  if (userId === user.id) {
    throw new Error("Нельзя изменить собственную роль")
  }

  const validRoles = ["admin", "project_manager", "executor", "observer"]
  if (!validRoles.includes(newRole)) {
    throw new Error("Некорректная роль")
  }

  await db.update(users).set({ role: newRole }).where(eq(users.id, userId))

  // Аудит
  await db.insert(auditLogs).values({
    action: "user_role_changed",
    entityType: "user",
    entityId: userId,
    userId: user.id,
    details: { newRole },
  })

  revalidatePath("/users")
}

export async function deactivateUser(userId: string) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any
  if (!canManageUsers(user)) {
    throw new Error("Недостаточно прав для деактивации пользователей")
  }

  // Нельзя деактивировать самого себя
  if (userId === user.id) {
    throw new Error("Нельзя деактивировать собственный аккаунт")
  }

  // Здесь можно добавить поле isActive в схему пользователей
  // Пока просто логируем действие
  await db.insert(auditLogs).values({
    action: "user_deactivated",
    entityType: "user",
    entityId: userId,
    userId: user.id,
    details: {},
  })

  revalidatePath("/users")
}
