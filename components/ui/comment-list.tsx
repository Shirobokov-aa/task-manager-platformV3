import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"

interface Comment {
  id: string
  content: string
  createdAt: Date | null
  updatedAt: Date | null
  author: {
    id: string
    name: string
    email: string
  }
}

interface CommentListProps {
  comments: Comment[]
  currentUserId: string
}

export function CommentList({ comments, currentUserId }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>Комментариев пока нет</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-sm">{comment.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{comment.author.name}</span>
                <span className="text-xs text-gray-600">
                  {comment.createdAt && new Date(comment.createdAt).toLocaleDateString("ru-RU")}
                </span>
              </div>
              {comment.author.id === currentUserId && (
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="mt-1 text-sm">
              <p className="whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
