import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { sanitizeBlogHtml } from '@/lib/blog/sanitize';

interface BlogPostPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  coverImageUrl: string | null;
  coverImageAlt: string;
  html: string;
  authorName: string;
  authorBio: string | null;
  authorAvatarUrl: string | null;
}

/** Renders exactly what the public post page will render: sanitized HTML in `prose prose-lg`. */
export const BlogPostPreview = ({
  open,
  onOpenChange,
  title,
  coverImageUrl,
  coverImageAlt,
  html,
  authorName,
  authorBio,
  authorAvatarUrl,
}: BlogPostPreviewProps) => {
  const safeHtml = sanitizeBlogHtml(html);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
        </DialogHeader>
        <article className="space-y-6">
          {coverImageUrl && (
            <img
              src={coverImageUrl}
              alt={coverImageAlt}
              className="aspect-[16/9] w-full rounded-xl object-cover"
            />
          )}
          <h1 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {title || 'Untitled post'}
          </h1>
          <div className="flex items-center gap-3 border-y border-border/60 py-4">
            <Avatar className="h-11 w-11 border">
              <AvatarImage src={authorAvatarUrl ?? undefined} alt={authorName} />
              <AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{authorName || 'Unassigned author'}</p>
              {authorBio && <p className="text-sm text-muted-foreground">{authorBio}</p>}
            </div>
          </div>
          <div
            className="prose prose-lg max-w-none prose-headings:font-display prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </article>
      </DialogContent>
    </Dialog>
  );
};

export default BlogPostPreview;
