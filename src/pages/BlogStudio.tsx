import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Newspaper, UserCircle2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/common/SkeletonLoader';
import { useToast } from '@/components/ui/use-toast';
import { AppShell, type AppNavEntry } from '@/components/layout/app-shell';
import { useAuth } from '@/hooks/useAuth';

import { BlogAvatarUpload } from '@/components/admin/blog/BlogAvatarUpload';
import { BlogBioField } from '@/components/admin/blog/BlogBioField';
import { BlogPostEditor } from '@/components/admin/blog/BlogPostEditor';
import { BlogPostsList } from '@/components/admin/blog/BlogPostsList';
import { updateOwnBlogAuthorProfile } from '@/components/admin/blog/blogAdminApi';
import { useBlogAuthorAccess } from '@/components/admin/blog/useBlogAuthorAccess';
import type { BlogAuthor } from '@/lib/blog/types';

const STORAGE_KEY = 'blog-studio:activeSection';

const STUDIO_NAV: AppNavEntry[] = [
  { id: 'posts', label: 'My Posts', icon: FileText },
  { id: 'profile', label: 'My Blogger Profile', icon: UserCircle2 },
];

const ProfileCard = ({ author }: { author: BlogAuthor }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bio, setBio] = useState(author.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(author.avatar_url ?? null);

  const save = useMutation({
    mutationFn: () => updateOwnBlogAuthorProfile(author.user_id, { bio: bio.trim() || null, avatar_url: avatarUrl }),
    onSuccess: () => {
      toast({ title: 'Profile updated' });
      queryClient.invalidateQueries({ queryKey: ['blog-author-self', author.user_id] });
    },
    onError: (error) => {
      toast({
        title: 'Could not save',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  const dirty = bio !== (author.bio ?? '') || avatarUrl !== author.avatar_url;

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>My blogger profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Byline name</p>
          <p className="text-sm text-muted-foreground">{author.display_name} (set by an administrator)</p>
        </div>
        <BlogAvatarUpload
          authorId={author.user_id}
          avatarUrl={avatarUrl}
          displayName={author.display_name}
          onUploaded={setAvatarUrl}
        />
        <BlogBioField value={bio} onChange={setBio} />
        <button
          type="button"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate()}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow disabled:pointer-events-none disabled:opacity-50"
        >
          {save.isPending ? 'Saving…' : 'Save profile'}
        </button>
      </CardContent>
    </Card>
  );
};

const BlogStudio = () => {
  const { user, loading: authLoading } = useAuth();
  const { author, isBlogger, isLoading: accessLoading } = useBlogAuthorAccess();
  const [activeSection, setActiveSection] = useState(() => sessionStorage.getItem(STORAGE_KEY) || 'posts');
  const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);

  const handleSectionChange = (id: string) => {
    setActiveSection(id);
    sessionStorage.setItem(STORAGE_KEY, id);
    setIsEditing(false);
  };

  if (authLoading || accessLoading) {
    return <PageSkeleton />;
  }

  if (!user || !isBlogger || !author) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="max-w-md text-center">
          <CardContent className="space-y-3 py-10">
            <Newspaper className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="font-display text-xl font-semibold text-foreground">No blogging access yet</h1>
            <p className="text-muted-foreground">
              You don't have blogging access. Ask an administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <AppShell
        panelName="Blog Studio"
        nav={STUDIO_NAV}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      >
        <BlogPostEditor
          postId={editingPostId}
          mode="blogger"
          selfAuthorId={author.user_id}
          onClose={() => setIsEditing(false)}
          onSaved={(id) => setEditingPostId(id)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      panelName="Blog Studio"
      nav={STUDIO_NAV}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      pageTitle={activeSection === 'posts' ? 'My Posts' : 'My Blogger Profile'}
      pageDescription={
        activeSection === 'posts'
          ? 'Write, publish, and manage the posts under your byline.'
          : 'Your public photo and bio. Only an administrator can change your byline name.'
      }
    >
      {activeSection === 'posts' ? (
        <BlogPostsList
          scope="own"
          authorId={author.user_id}
          onEdit={(postId) => {
            setEditingPostId(postId);
            setIsEditing(true);
          }}
        />
      ) : (
        <ProfileCard author={author} />
      )}
    </AppShell>
  );
};

export default BlogStudio;
