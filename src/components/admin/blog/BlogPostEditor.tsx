import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Youtube from '@tiptap/extension-youtube';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { CalendarClock, ChevronLeft, Eye, Send, Undo2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { sanitizeBlogHtml } from '@/lib/blog/sanitize';
import { readingMinutes, slugify } from '@/lib/blog/format';
import type { BlogPostInput, BlogPostStatus } from '@/lib/blog/types';

import { BlogAvatarUpload } from './BlogAvatarUpload';
import { BlogPostPreview } from './BlogPostPreview';
import { ImageCropDialog } from './ImageCropDialog';
import { TagInput } from './TagInput';
import { EditorToolbar } from './editor/EditorToolbar';
import {
  createPost,
  friendlySaveError,
  getOwnBlogAuthor,
  getPostForEdit,
  listActiveAuthorsForSelect,
  updatePost,
  uploadBlogImage,
  assertValidImageFile,
  publishNowTimestamp,
  type BlogPostForEdit,
} from './blogAdminApi';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface BlogPostEditorProps {
  /** Undefined creates a new post. */
  postId?: string;
  mode: 'admin' | 'blogger';
  /** The signed-in user's own uid, used as the fixed author in blogger mode. */
  selfAuthorId: string;
  onClose: () => void;
  /** Fired once a brand-new post gets its id from the first save. */
  onSaved?: (postId: string) => void;
}

export const BlogPostEditor = ({ postId, mode, selfAuthorId, onClose, onSaved }: BlogPostEditorProps) => {
  const postQuery = useQuery({
    queryKey: ['blog-post-edit', postId],
    queryFn: () => getPostForEdit(postId as string),
    enabled: !!postId,
  });

  if (postId && postQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (postId && (postQuery.isError || !postQuery.data)) {
    return (
      <Card>
        <CardContent className="space-y-3 py-10 text-center">
          <p className="text-muted-foreground">This post could not be loaded.</p>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to posts
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <BlogPostEditorForm
      key={postId ?? 'new'}
      initialPost={postQuery.data ?? null}
      postId={postId}
      mode={mode}
      selfAuthorId={selfAuthorId}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
};

interface FormProps {
  initialPost: BlogPostForEdit | null;
  postId?: string;
  mode: 'admin' | 'blogger';
  selfAuthorId: string;
  onClose: () => void;
  onSaved?: (postId: string) => void;
}

const BlogPostEditorForm = ({ initialPost, postId, mode, selfAuthorId, onClose, onSaved }: FormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(initialPost?.title ?? '');
  const [slug, setSlug] = useState(initialPost?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!initialPost);
  const [authorId, setAuthorId] = useState(initialPost?.author_id ?? (mode === 'blogger' ? selfAuthorId : ''));
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(initialPost?.cover_image_url ?? null);
  const [coverImageAlt, setCoverImageAlt] = useState(initialPost?.cover_image_alt ?? '');
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt ?? '');
  const [tags, setTags] = useState<string[]>(initialPost?.tags ?? []);
  const [seoTitle, setSeoTitle] = useState(initialPost?.seo_title ?? '');
  const [seoDescription, setSeoDescription] = useState(initialPost?.seo_description ?? '');
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [coverCropOpen, setCoverCropOpen] = useState(false);

  const touch = () => setDirty(true);
  const currentStatus: BlogPostStatus = initialPost?.status ?? 'draft';
  const currentPublishedAt = initialPost?.published_at ?? null;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer nofollow' },
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg' } }),
      Youtube.configure({ nocookie: true, HTMLAttributes: { class: 'aspect-video w-full rounded-lg' } }),
      Placeholder.configure({ placeholder: 'Start writing your post…' }),
      CharacterCount,
    ],
    content: initialPost?.content_html || '',
    onUpdate: () => touch(),
    editorProps: {
      attributes: {
        class:
          'prose prose-lg max-w-none px-4 py-4 focus:outline-none min-h-[320px] prose-headings:font-display prose-img:rounded-lg',
      },
    },
  });

  // Auto-derive the slug from the title until the blogger edits it directly.
  // Existing posts start "touched" so title tweaks never move a live URL.
  useEffect(() => {
    if (slugTouched) return;
    setSlug(slugify(title));
  }, [title, slugTouched]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const activeAuthorsQuery = useQuery({
    queryKey: ['blog-active-authors'],
    queryFn: listActiveAuthorsForSelect,
    enabled: mode === 'admin',
  });

  const authorOptions = useMemo(() => {
    const options = activeAuthorsQuery.data ?? [];
    if (initialPost?.author && !options.some((option) => option.user_id === initialPost.author!.user_id)) {
      return [{ user_id: initialPost.author.user_id, display_name: `${initialPost.author.display_name} (inactive)` }, ...options];
    }
    return options;
  }, [activeAuthorsQuery.data, initialPost]);

  const bylineQuery = useQuery({
    queryKey: ['blog-author-byline', authorId],
    queryFn: () => getOwnBlogAuthor(authorId),
    enabled: !!authorId,
  });

  const words = editor?.storage.characterCount?.words() ?? 0;
  const estimatedMinutes = Math.max(1, Math.round(words / 220));

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required.';
    if (!slug || !SLUG_PATTERN.test(slug)) {
      return 'Slug must be lowercase letters, numbers, and single hyphens, e.g. my-post-title.';
    }
    if (excerpt.length > 400) return 'Excerpt must be 400 characters or fewer.';
    if (seoTitle.length > 70) return 'SEO title must be 70 characters or fewer.';
    if (seoDescription.length > 170) return 'SEO description must be 170 characters or fewer.';
    if (!authorId) return 'Choose an author.';
    return null;
  };

  const buildPayload = (status: BlogPostStatus): BlogPostInput => {
    const html = sanitizeBlogHtml(editor?.getHTML() ?? '');
    return {
      author_id: authorId,
      title: title.trim(),
      slug,
      excerpt: excerpt.trim() ? excerpt.trim() : null,
      content_json: editor?.getJSON() ?? {},
      content_html: html,
      cover_image_url: coverImageUrl,
      cover_image_alt: coverImageAlt.trim() ? coverImageAlt.trim() : null,
      tags,
      status,
      reading_minutes: readingMinutes(html),
      seo_title: seoTitle.trim() ? seoTitle.trim() : null,
      seo_description: seoDescription.trim() ? seoDescription.trim() : null,
    };
  };

  const saveMutation = useMutation({
    mutationFn: async ({ status, publishedAt }: { status: BlogPostStatus; publishedAt?: string }) => {
      const validationError = validate();
      if (validationError) throw new Error(validationError);
      const payload: BlogPostInput & { published_at?: string } = buildPayload(status);
      if (status === 'published' && publishedAt) payload.published_at = publishedAt;
      if (postId) return updatePost(postId, payload);
      return createPost(payload);
    },
    onSuccess: (post, variables) => {
      setDirty(false);
      const scheduled = variables.status === 'published' && !!variables.publishedAt && new Date(variables.publishedAt) > new Date();
      toast({
        title: variables.status === 'draft' ? 'Draft saved' : scheduled ? 'Post scheduled' : 'Post published',
      });
      queryClient.invalidateQueries({ queryKey: ['blog-posts-admin'] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts-own'] });
      queryClient.invalidateQueries({ queryKey: ['blog-post-edit', post.id] });
      if (!postId) onSaved?.(post.id);
    },
    onError: (error) => {
      toast({ title: 'Could not save', description: friendlySaveError(error), variant: 'destructive' });
    },
  });

  const handleCoverFilePicked = (file: File | undefined) => {
    if (!file || !authorId) return;
    try {
      assertValidImageFile(file);
    } catch (error) {
      toast({
        title: 'Invalid image',
        description: error instanceof Error ? error.message : 'Please choose a different image.',
        variant: 'destructive',
      });
      return;
    }
    setPendingCoverFile(file);
    setCoverCropOpen(true);
  };

  const handleCoverCropped = async (croppedFile: File) => {
    if (!authorId) return;
    setCoverUploading(true);
    try {
      const url = await uploadBlogImage(authorId, croppedFile, 'covers');
      setCoverImageUrl(url);
      touch();
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload the cover image.',
        variant: 'destructive',
      });
    } finally {
      setCoverUploading(false);
      setPendingCoverFile(null);
    }
  };

  const isPublished = currentStatus === 'published';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-2" onClick={onClose}>
          <ChevronLeft className="h-4 w-4" />
          Back to posts
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            Preview
          </Button>
          {isPublished && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate({ status: 'draft' })}
            >
              <Undo2 className="h-4 w-4" />
              Unpublish
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate({ status: 'draft' })}
          >
            Save draft
          </Button>
          <div className="flex items-center">
            <Button
              size="sm"
              className="gap-2 rounded-r-none"
              disabled={saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate({ status: 'published', publishedAt: publishNowTimestamp(currentPublishedAt) })
              }
            >
              <Send className="h-4 w-4" />
              Publish
            </Button>
            <Popover open={scheduleOpen} onOpenChange={setScheduleOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="rounded-l-none border-l border-primary-foreground/30 px-2" aria-label="Schedule for later">
                  <CalendarClock className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="schedule-datetime">Publish at</Label>
                  <Input
                    id="schedule-datetime"
                    type="datetime-local"
                    value={scheduleValue}
                    onChange={(event) => setScheduleValue(event.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!scheduleValue || saveMutation.isPending}
                  onClick={() => {
                    const iso = new Date(scheduleValue).toISOString();
                    saveMutation.mutate({ status: 'published', publishedAt: iso });
                    setScheduleOpen(false);
                  }}
                >
                  Schedule
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="space-y-1.5">
                <Label htmlFor="post-title" className="sr-only">
                  Title
                </Label>
                <Input
                  id="post-title"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    touch();
                  }}
                  placeholder="Post title"
                  className="h-auto border-none px-0 font-display text-3xl font-semibold shadow-none focus-visible:ring-0 sm:text-4xl"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">/blog/</span>
                <Input
                  id="post-slug"
                  value={slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    touch();
                  }}
                  className="h-7 max-w-xs flex-1 px-1 text-sm"
                />
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <EditorToolbar editor={editor} authorId={authorId || null} />
                <EditorContent editor={editor} />
              </div>
              <p className="text-xs text-muted-foreground">
                {words} words · about {estimatedMinutes} min read
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Author</CardTitle>
            </CardHeader>
            <CardContent>
              {mode === 'blogger' ? (
                <p className="text-sm text-muted-foreground">
                  {bylineQuery.data?.display_name ?? 'You'} (your byline)
                </p>
              ) : (
                <Select value={authorId} onValueChange={(value) => { setAuthorId(value); touch(); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an author" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorOptions.map((option) => (
                      <SelectItem key={option.user_id} value={option.user_id}>
                        {option.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cover image</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {coverImageUrl && (
                <img src={coverImageUrl} alt={coverImageAlt} className="aspect-video w-full rounded-lg object-cover" />
              )}
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                disabled={!authorId || coverUploading}
                onChange={(event) => {
                  handleCoverFilePicked(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <ImageCropDialog
                open={coverCropOpen}
                onOpenChange={(next) => {
                  setCoverCropOpen(next);
                  if (!next) setPendingCoverFile(null);
                }}
                file={pendingCoverFile}
                variant="cover"
                fileName="cover"
                onCropped={handleCoverCropped}
              />
              <div className="space-y-1.5">
                <Label htmlFor="cover-alt">Alt text</Label>
                <Input
                  id="cover-alt"
                  value={coverImageAlt}
                  onChange={(event) => {
                    setCoverImageAlt(event.target.value);
                    touch();
                  }}
                  placeholder="Describe the cover image"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Excerpt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              <Textarea
                value={excerpt}
                onChange={(event) => {
                  setExcerpt(event.target.value.slice(0, 400));
                  touch();
                }}
                maxLength={400}
                rows={3}
                placeholder="A short summary shown on the blog list"
              />
              <p className={cn('text-xs', excerpt.length > 400 ? 'text-destructive' : 'text-muted-foreground')}>
                {excerpt.length}/400
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <TagInput value={tags} onChange={(value) => { setTags(value); touch(); }} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="seo-title">SEO title</Label>
                <Input
                  id="seo-title"
                  value={seoTitle}
                  onChange={(event) => {
                    setSeoTitle(event.target.value.slice(0, 70));
                    touch();
                  }}
                  maxLength={70}
                />
                <p className="text-xs text-muted-foreground">{seoTitle.length}/70</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="seo-description">SEO description</Label>
                <Textarea
                  id="seo-description"
                  value={seoDescription}
                  onChange={(event) => {
                    setSeoDescription(event.target.value.slice(0, 170));
                    touch();
                  }}
                  maxLength={170}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">{seoDescription.length}/170</p>
              </div>
            </CardContent>
          </Card>

          {mode === 'admin' && authorId && bylineQuery.data && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reassign byline photo</CardTitle>
              </CardHeader>
              <CardContent>
                <BlogAvatarUpload
                  authorId={authorId}
                  avatarUrl={bylineQuery.data.avatar_url}
                  displayName={bylineQuery.data.display_name}
                  onUploaded={() => queryClient.invalidateQueries({ queryKey: ['blog-author-byline', authorId] })}
                />
              </CardContent>
            </Card>
          )}

          {currentStatus !== 'draft' && (
            <Badge variant="secondary" className="w-fit">
              {currentPublishedAt && new Date(currentPublishedAt) > new Date() ? 'Scheduled' : 'Published'}
            </Badge>
          )}
        </div>
      </div>

      <BlogPostPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={title}
        coverImageUrl={coverImageUrl}
        coverImageAlt={coverImageAlt}
        html={editor?.getHTML() ?? ''}
        authorName={bylineQuery.data?.display_name ?? ''}
        authorBio={bylineQuery.data?.bio ?? null}
        authorAvatarUrl={bylineQuery.data?.avatar_url ?? null}
      />
    </div>
  );
};

export default BlogPostEditor;
