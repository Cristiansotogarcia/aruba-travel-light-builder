import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Eye, Pencil, Plus, Search, Send, Trash2, Undo2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { deletePost, listAllPostsAdmin, listOwnPosts, setPostStatus, type BlogPostListRow } from './blogAdminApi';

type StatusFilter = 'all' | 'draft' | 'published' | 'scheduled';

interface BlogPostsListProps {
  scope: 'admin' | 'own';
  authorId?: string;
  onEdit: (postId?: string) => void;
}

const isScheduled = (post: BlogPostListRow) =>
  post.status === 'published' && !!post.published_at && new Date(post.published_at).getTime() > Date.now();

const badgeFor = (post: BlogPostListRow) => {
  if (post.status === 'draft') return { label: 'Draft', variant: 'outline' as const };
  if (isScheduled(post)) return { label: 'Scheduled', variant: 'secondary' as const };
  return { label: 'Published', variant: 'default' as const };
};

export const BlogPostsList = ({ scope, authorId, onEdit }: BlogPostsListProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [deleting, setDeleting] = useState<BlogPostListRow | null>(null);

  const queryKey = scope === 'admin' ? ['blog-posts-admin'] : ['blog-posts-own', authorId];

  const { data: posts = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => (scope === 'admin' ? listAllPostsAdmin() : listOwnPosts(authorId as string)),
    enabled: scope === 'admin' || !!authorId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['blog-posts-admin'] });
    queryClient.invalidateQueries({ queryKey: ['blog-posts-own', authorId] });
  };

  const publishMutation = useMutation({
    mutationFn: (post: BlogPostListRow) => setPostStatus(post.id, 'published'),
    onSuccess: () => {
      toast({ title: 'Post published' });
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not publish'),
  });

  const unpublishMutation = useMutation({
    mutationFn: (post: BlogPostListRow) => setPostStatus(post.id, 'draft'),
    onSuccess: () => {
      toast({ title: 'Post unpublished' });
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not unpublish'),
  });

  const deleteMutation = useMutation({
    mutationFn: (post: BlogPostListRow) => deletePost(post.id),
    onSuccess: () => {
      toast({ title: 'Post deleted' });
      setDeleting(null);
      invalidate();
    },
    onError: (error) => toastError(error, 'Could not delete'),
  });

  function toastError(error: unknown, title: string) {
    toast({
      title,
      description: error instanceof Error ? error.message : 'Please try again.',
      variant: 'destructive',
    });
  }

  const filtered = useMemo(() => {
    return posts.filter((post) => {
      if (search.trim() && !post.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (status === 'all') return true;
      if (status === 'draft') return post.status === 'draft';
      if (status === 'scheduled') return isScheduled(post);
      if (status === 'published') return post.status === 'published' && !isScheduled(post);
      return true;
    });
  }, [posts, search, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
            <SelectTrigger className="sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => onEdit(undefined)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          New post
        </Button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-20 rounded-lg bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {posts.length === 0 ? 'No posts yet.' : 'No posts match your search.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => {
            const badge = badgeFor(post);
            return (
              <Card key={post.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{post.title}</p>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {scope === 'admin' && post.author ? `${post.author.display_name} · ` : ''}
                      Updated {new Date(post.updated_at).toLocaleDateString()}
                      {isScheduled(post) && post.published_at
                        ? ` · goes live ${new Date(post.published_at).toLocaleString()}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {post.status === 'published' && !isScheduled(post) && (
                      <Button variant="ghost" size="sm" asChild className="gap-2">
                        <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">
                          <Eye className="h-4 w-4" />
                          View
                        </a>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => onEdit(post.id)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    {post.status === 'draft' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate(post)}
                      >
                        <Send className="h-4 w-4" />
                        Publish
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={unpublishMutation.isPending}
                        onClick={() => unpublishMutation.mutate(post)}
                      >
                        <Undo2 className="h-4 w-4" />
                        Unpublish
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-destructive hover:text-destructive"
                      onClick={() => setDeleting(post)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Delete "{deleting?.title}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the post. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogPostsList;
