import type { Transporter } from "nodemailer"
import nodemailer from "nodemailer"

interface EmailOptions {
  to: string
  subject: string
  html: string
}

// Создаем транспорт для отправки email
const transporter: Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: Number.parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.log("Email не настроен, пропускаем отправку:", { to, subject })
      return
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    })

    console.log("Email отправлен:", info.messageId)
    return info
  } catch (error) {
    console.error("Ошибка отправки email:", error)
    throw error
  }
}
