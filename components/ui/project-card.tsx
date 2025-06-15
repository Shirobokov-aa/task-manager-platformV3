import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, CheckSquare, Clock } from "lucide-react"
import type { Project } from "@/lib/db/schema"
import Link from "next/link"

interface ProjectCardProps {
  project: Project & {
    owner: { name: string; email: string }
    _count?: {
      members: number
      tasks: number
      completedTasks: number
    }
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const completionRate = project._count?.tasks
    ? Math.round((project._count.completedTasks / project._count.tasks) * 100)
    : 0

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl font-semibold line-clamp-2">{project.title}</CardTitle>
            <Badge variant="outline">{completionRate}% завершено</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {project.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{project.description}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-sm">{project.owner.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{project.owner.name}</p>
                <p className="text-xs text-muted-foreground">Владелец</p>
              </div>
            </div>

            <div className="flex gap-4 text-sm text-muted-foreground">
              {project._count && (
                <>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{project._count.members}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckSquare className="w-4 h-4" />
                    <span>{project._count.tasks}</span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{new Date(project.createdAt!).toLocaleDateString("ru-RU")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
