import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { projects, users, projectMembers } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"
import { ProjectCard } from "@/components/ui/project-card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  // Получаем проекты пользователя с дополнительной информацией
  const userProjects = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      ownerId: projects.ownerId,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      owner: {
        name: users.name,
        email: users.email,
      },
    })
    .from(projects)
    .innerJoin(users, eq(projects.ownerId, users.id))
    .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
    .where(eq(projectMembers.userId, session.user.id))
    .orderBy(desc(projects.updatedAt))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Мои проекты</h1>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="w-4 h-4 mr-2" />
            Создать проект
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
