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

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Введите текущий пароль"),
  newPassword: z.string().min(6, "Новый пароль должен содержать минимум 6 символов"),
  confirmPassword: z.string().min(1, "Подтвердите новый пароль"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
})

export async function changePassword(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  const data = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  }

  const validatedData = changePasswordSchema.parse(data)

  // Получаем текущего пользователя из БД
  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
  if (!currentUser) {
    throw new Error("Пользователь не найден")
  }

  // Проверяем текущий пароль
  const isCurrentPasswordValid = await bcrypt.compare(validatedData.currentPassword, currentUser.passwordHash)
  if (!isCurrentPasswordValid) {
    throw new Error("Неверный текущий пароль")
  }

  // Проверяем, что новый пароль отличается от текущего
  const isSamePassword = await bcrypt.compare(validatedData.newPassword, currentUser.passwordHash)
  if (isSamePassword) {
    throw new Error("Новый пароль должен отличаться от текущего")
  }

  // Хешируем новый пароль
  const newPasswordHash = await bcrypt.hash(validatedData.newPassword, 12)

  // Обновляем пароль в БД
  await db
    .update(users)
    .set({
      passwordHash: newPasswordHash,
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id))

  // Аудит
  await db.insert(auditLogs).values({
    action: "password_changed",
    entityType: "user",
    entityId: user.id,
    userId: user.id,
    details: { timestamp: new Date().toISOString() },
  })

  revalidatePath("/settings")
  return { success: true, message: "Пароль успешно изменен" }
}

const updateProfileSchema = z.object({
  name: z.string()
    .min(1, "Имя обязательно")
    .max(255, "Имя не может быть длиннее 255 символов")
    .trim(),
  email: z.string()
    .email("Некорректный email адрес")
    .max(255, "Email не может быть длиннее 255 символов")
    .toLowerCase()
    .trim(),
  department: z.string()
    .max(255, "Название отдела не может быть длиннее 255 символов")
    .trim()
    .optional()
    .or(z.literal("")),
})

export async function updateProfile(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    throw new Error("Не авторизован")
  }

  const user = session.user as any

  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    department: (formData.get("department") as string) || "",
  }

  const validatedData = updateProfileSchema.parse(data)

  // Проверяем, не занят ли email другим пользователем
  if (validatedData.email !== user.email) {
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, validatedData.email))
      .limit(1)

    if (existingUser.length > 0 && existingUser[0].id !== user.id) {
      throw new Error("Пользователь с таким email уже существует")
    }
  }

  // Обновляем профиль
  const [updatedUser] = await db
    .update(users)
    .set({
      name: validatedData.name,
      email: validatedData.email,
      department: validatedData.department && validatedData.department.length > 0 ? validatedData.department : null,
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id))
    .returning()

  if (!updatedUser) {
    throw new Error("Не удалось обновить профиль")
  }

  // Аудит
  await db.insert(auditLogs).values({
    action: "profile_updated",
    entityType: "user",
    entityId: user.id,
    userId: user.id,
    details: {
      name: validatedData.name,
      email: validatedData.email,
      department: validatedData.department
    },
  })

  revalidatePath("/settings")
  revalidatePath("/")

    // Возвращаем обновленные данные для клиента
  return {
    success: true,
    message: "Профиль успешно обновлен",
    updatedUser: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department
    }
  }
}
