import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials")
          return null
        }

        const user = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1)
        console.log("Found user:", user[0])

        if (!user.length) {
          console.log("User not found")
          return null
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user[0].passwordHash)
        console.log("Password valid:", isPasswordValid)
        console.log("Input password:", credentials.password)
        console.log("Stored hash:", user[0].passwordHash)

        if (!isPasswordValid) {
          console.log("Invalid password")
          return null
        }

        return {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name,
          role: user[0].role,
          department: user[0].department || undefined,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.department = user.department
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.department = token.department as string
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
}
