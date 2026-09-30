import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Newspaper, Users, UserCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/common/SkeletonLoader';
import { useToast } from '@/components/ui/use-toast';
import { AppShell, type AppNavEntry } from '@/components/layout/app-shell';
import { useAuth } from '@/hooks/useAuth';
import { getRoleHomeRoute } from '@/lib/navigation/roleHome';
import { useNavigate } from 'react-router-dom';

import { BlogAvatarUpload } from '@/components/admin/blog/BlogAvatarUpload';
import { BlogBioField } from '@/components/admin/blog/BlogBioField';
import { BlogBloggersTab } from '@/components/admin/blog/BlogBloggersTab';
import { BlogPostEditor } from '@/components/admin/blog/BlogPostEditor';
import { BlogPostsList } from '@/components/admin/blog/BlogPostsList';
import { updateOwnBlogAuthorProfile } from '@/components/admin/blog/blogAdminApi';
import { useBlogAuthorAccess } from '@/components/admin/blog/useBlogAuthorAccess';
import type { BlogAuthor } from '@/lib/blog/types';

const STORAGE_KEY = 'blog-studio:activeSection';

const BLOGGER_NAV: AppNavEntry[] = [
  { id: 'posts', label: 'My Posts', icon: FileText },
  { id: 'profile', label: 'My Blogger Profile', icon: UserCircle2 },
];

/** Admins get the same "all posts + bloggers" surface Contents > Blog used to
 * duplicate (see BlogManagement, now removed); the studio is the one home for
 * both an admin's and a blogger's blog work. */
const buildAdminNav = (alsoBlogger: boolean): AppNavEntry[] => [
  { id: 'posts', label: 'All Posts', icon: FileText },
  { id: 'bloggers', label: 'Bloggers', icon: Users },
  ...(alsoBlogger ? [{ id: 'profile', label: 'My Blogger Profile', icon: UserCircle2 }] : []),
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
  const { user, profile, loading: authLoading } = useAuth();
  const { author, isBlogger, isLoading: accessLoading } = useBlogAuthorAccess();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'Admin' || profile?.role === 'SuperUser';

  const nav = useMemo(
    () => (isAdmin ? buildAdminNav(isBlogger) : BLOGGER_NAV),
    [isAdmin, isBlogger],
  );

  const [activeSection, setActiveSection] = useState(() => sessionStorage.getItem(STORAGE_KEY) || 'posts');
  const [editingPostId, setEditingPostId] = useState<string | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);

  const handleSectionChange = (id: string) => {
    setActiveSection(id);
    sessionStorage.setItem(STORAGE_KEY, id);
    setIsEditing(false);
  };

  const backButton = (
    <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(getRoleHomeRoute(profile?.role))}>
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  );

  if (authLoading || accessLoading) {
    return <PageSkeleton />;
  }

  // A blogger's own profile only exists once they hold a blog_authors row; an
  // admin with no such row still gets the full admin surface below.
  if (!user || (!isAdmin && (!isBlogger || !author))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="max-w-md text-center">
          <CardContent className="space-y-3 py-10">
            <Newspaper className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="font-display text-xl font-semibold text-foreground">No blogging access yet</h1>
            <p className="text-muted-foreground">
              You don't have blogging access. Ask an administrator.
            </p>
            <div className="flex justify-center pt-2">{backButton}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const editorMode = isAdmin ? 'admin' : 'blogger';
  const editorSelfAuthorId = isAdmin ? user.id : (author as BlogAuthor).user_id;

  if (isEditing) {
    return (
      <AppShell
        panelName="Blog Studio"
        nav={nav}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      >
        <BlogPostEditor
          postId={editingPostId}
          mode={editorMode}
          selfAuthorId={editorSelfAuthorId}
          onClose={() => setIsEditing(false)}
          onSaved={(id) => setEditingPostId(id)}
        />
      </AppShell>
    );
  }

  const sectionCopy: Record<string, { title: string; description: string }> = {
    posts: isAdmin
      ? { title: 'All Posts', description: 'Every post, any author, any status.' }
      : { title: 'My Posts', description: 'Write, publish, and manage the posts under your byline.' },
    bloggers: {
      title: 'Bloggers',
      description: 'Manage everyone allowed to write a post.',
    },
    profile: {
      title: 'My Blogger Profile',
      description: 'Your public photo and bio. Only an administrator can change your byline name.',
    },
  };
  const copy = sectionCopy[activeSection] ?? sectionCopy.posts;

  return (
    <AppShell
      panelName="Blog Studio"
      nav={nav}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      pageTitle={copy.title}
      pageDescription={copy.description}
      pageActions={backButton}
    >
      {activeSection === 'bloggers' && isAdmin ? (
        <BlogBloggersTab />
      ) : activeSection === 'profile' && author ? (
        <ProfileCard author={author} />
      ) : (
        <BlogPostsList
          scope={isAdmin ? 'admin' : 'own'}
          authorId={author?.user_id}
          onEdit={(postId) => {
            setEditingPostId(postId);
            setIsEditing(true);
          }}
        />
      )}
    </AppShell>
  );
};

export default BlogStudio;
