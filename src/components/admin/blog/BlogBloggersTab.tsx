import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, CheckCircle2, Pencil, Plus, Search } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { BlogAvatarUpload } from './BlogAvatarUpload';
import { BlogBioField } from './BlogBioField';
import {
  type BlogAuthorWithProfile,
  type EligibleProfile,
  grantBlogAuthor,
  listAuthorsAdmin,
  searchEligibleProfiles,
  updateBlogAuthorAdmin,
} from './blogAdminApi';

const AUTHORS_KEY = ['blog-authors-admin'];

function AddBloggerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EligibleProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const { data: candidates = [], isFetching } = useQuery({
    queryKey: ['blog-eligible-profiles', search],
    queryFn: () => searchEligibleProfiles(search),
    enabled: open && !selected,
  });

  const reset = () => {
    setSearch('');
    setSelected(null);
    setDisplayName('');
    setBio('');
    setAvatarUrl(null);
  };

  const grant = useMutation({
    mutationFn: () => {
      if (!selected || !user) throw new Error('Pick a user first.');
      return grantBlogAuthor({
        user_id: selected.id,
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        granted_by: user.id,
      });
    },
    onSuccess: () => {
      toast({ title: 'Blogger added', description: `${displayName} can now publish posts.` });
      queryClient.invalidateQueries({ queryKey: AUTHORS_KEY });
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Could not add blogger',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add blogger</DialogTitle>
          <DialogDescription>Grant an existing user permission to write and publish posts.</DialogDescription>
        </DialogHeader>

        {!selected ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or email"
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {isFetching && <p className="py-4 text-center text-sm text-muted-foreground">Searching…</p>}
              {!isFetching && candidates.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No eligible users found. Anyone already blogging is excluded.
                </p>
              )}
              {candidates.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    setSelected(profile);
                    setDisplayName(profile.name);
                  }}
                  className="flex w-full items-center justify-between rounded-md border border-transparent px-3 py-2 text-left text-sm hover:border-border hover:bg-muted"
                >
                  <span className="font-medium">{profile.name}</span>
                  <span className="text-muted-foreground">{profile.email}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <p className="font-medium">{selected.name}</p>
              <p className="text-muted-foreground">{selected.email}</p>
              <button
                type="button"
                className="mt-1 text-xs text-primary underline"
                onClick={() => setSelected(null)}
              >
                Choose a different user
              </button>
            </div>

            <BlogAvatarUpload
              authorId={selected.id}
              avatarUrl={avatarUrl}
              displayName={displayName || selected.name}
              onUploaded={setAvatarUrl}
            />

            <div className="space-y-1.5">
              <Label htmlFor="new-blogger-name">Byline name</Label>
              <Input
                id="new-blogger-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={80}
              />
            </div>

            <BlogBioField value={bio} onChange={setBio} id="new-blogger-bio" />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || !displayName.trim() || grant.isPending}
            onClick={() => grant.mutate()}
          >
            {grant.isPending ? 'Adding…' : 'Add blogger'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditBloggerDialog({
  author,
  onOpenChange,
}: {
  author: BlogAuthorWithProfile | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState(author?.display_name ?? '');
  const [bio, setBio] = useState(author?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(author?.avatar_url ?? null);

  useMemo(() => {
    setDisplayName(author?.display_name ?? '');
    setBio(author?.bio ?? '');
    setAvatarUrl(author?.avatar_url ?? null);
  }, [author]);

  const save = useMutation({
    mutationFn: () => {
      if (!author) throw new Error('No blogger selected.');
      return updateBlogAuthorAdmin(author.user_id, {
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
      });
    },
    onSuccess: () => {
      toast({ title: 'Blogger updated' });
      queryClient.invalidateQueries({ queryKey: AUTHORS_KEY });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: 'Could not save',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={!!author} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit blogger</DialogTitle>
          <DialogDescription>{author?.profile?.email}</DialogDescription>
        </DialogHeader>
        {author && (
          <div className="space-y-4">
            <BlogAvatarUpload
              authorId={author.user_id}
              avatarUrl={avatarUrl}
              displayName={displayName}
              onUploaded={setAvatarUrl}
            />
            <div className="space-y-1.5">
              <Label htmlFor="edit-blogger-name">Byline name</Label>
              <Input
                id="edit-blogger-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={80}
              />
            </div>
            <BlogBioField value={bio} onChange={setBio} id="edit-blogger-bio" />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!displayName.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const BlogBloggersTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<BlogAuthorWithProfile | null>(null);
  const [revoking, setRevoking] = useState<BlogAuthorWithProfile | null>(null);

  const { data: authors = [], isLoading } = useQuery({
    queryKey: AUTHORS_KEY,
    queryFn: listAuthorsAdmin,
  });

  const toggleActive = useMutation({
    mutationFn: (author: BlogAuthorWithProfile) =>
      updateBlogAuthorAdmin(author.user_id, { is_active: !author.is_active }),
    onSuccess: (_data, author) => {
      toast({
        title: author.is_active ? 'Blogging access revoked' : 'Blogging access restored',
      });
      queryClient.invalidateQueries({ queryKey: AUTHORS_KEY });
      setRevoking(null);
    },
    onError: (error) => {
      toast({
        title: 'Could not update access',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Bloggers can write and publish posts under their own byline. Only an administrator can grant, rename, or revoke access.
        </p>
        <Button onClick={() => setAddOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add blogger
        </Button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-20 rounded-lg bg-muted" />
          ))}
        </div>
      ) : authors.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No bloggers yet. Add one to let them publish under their own byline.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {authors.map((author) => (
            <Card key={author.user_id}>
              <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={author.avatar_url ?? undefined} alt={author.display_name} />
                    <AvatarFallback>{author.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{author.display_name}</p>
                      <Badge variant={author.is_active ? 'default' : 'outline'} className="shrink-0">
                        {author.is_active ? 'Active' : 'Revoked'}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {author.profile?.name} · {author.profile?.email}
                    </p>
                    {author.bio && <p className="mt-1 truncate text-sm text-muted-foreground">{author.bio}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(author)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => (author.is_active ? setRevoking(author) : toggleActive.mutate(author))}
                  >
                    {author.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {author.is_active ? 'Revoke' : 'Restore'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddBloggerDialog open={addOpen} onOpenChange={setAddOpen} />
      <EditBloggerDialog author={editing} onOpenChange={(open) => !open && setEditing(null)} />

      <AlertDialog open={!!revoking} onOpenChange={(open) => !open && setRevoking(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke blogging access?</AlertDialogTitle>
            <AlertDialogDescription>
              {revoking?.display_name} will no longer be able to write or edit posts, and their byline photo and
              name will disappear from any posts they already published. Unpublish or reassign those posts first if
              you want to keep them live under a different byline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revoking && toggleActive.mutate(revoking)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogBloggersTab;
