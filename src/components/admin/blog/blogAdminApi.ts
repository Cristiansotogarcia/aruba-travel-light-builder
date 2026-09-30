// Admin/blogger-side data access for the blog. Builds on the frozen contract in
// src/lib/blog/ (types, the untyped `blogDb` client, the storage bucket name) but
// everything here is admin-only surface: it is never imported by the public pages.
import { blogDb, BLOG_IMAGES_BUCKET } from '@/lib/blog/client';
import type { BlogAuthor, BlogPost, BlogPostInput, BlogPostStatus } from '@/lib/blog/types';

// -- Posts --------------------------------------------------------------------

export interface BlogPostAuthorRef {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_active: boolean;
}

export interface BlogPostListRow
  extends Omit<BlogPost, 'content_json' | 'content_html'> {
  author: BlogPostAuthorRef | null;
}

export interface BlogPostForEdit extends BlogPost {
  author: (BlogPostAuthorRef & { bio: string | null }) | null;
}

const LIST_COLUMNS =
  'id, author_id, title, slug, excerpt, cover_image_url, cover_image_alt, tags, status, published_at, reading_minutes, seo_title, seo_description, created_at, updated_at, author:blog_authors(user_id, display_name, avatar_url, is_active)';

const EDIT_COLUMNS = '*, author:blog_authors(user_id, display_name, avatar_url, is_active, bio)';

/** Every post, any author, any status. Admin-only (RLS: blog_posts_admin_all). */
export async function listAllPostsAdmin(): Promise<BlogPostListRow[]> {
  const { data, error } = await blogDb
    .from('blog_posts')
    .select(LIST_COLUMNS)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BlogPostListRow[];
}

/** Only the given author's posts, any status (RLS: blog_posts_author_read). */
export async function listOwnPosts(authorId: string): Promise<BlogPostListRow[]> {
  const { data, error } = await blogDb
    .from('blog_posts')
    .select(LIST_COLUMNS)
    .eq('author_id', authorId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as BlogPostListRow[];
}

export async function getPostForEdit(id: string): Promise<BlogPostForEdit | null> {
  const { data, error } = await blogDb
    .from('blog_posts')
    .select(EDIT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BlogPostForEdit) ?? null;
}

/** `published_at` is outside BlogPostInput (the trigger normally owns it) but a
 * scheduled publish needs to set it explicitly, so both write helpers accept it. */
export async function createPost(
  input: BlogPostInput & { published_at?: string | null },
): Promise<BlogPost> {
  const { data, error } = await blogDb.from('blog_posts').insert(input).select().single();
  if (error) throw error;
  return data as BlogPost;
}

export async function updatePost(
  id: string,
  input: Partial<BlogPostInput> & { published_at?: string | null },
): Promise<BlogPost> {
  const { data, error } = await blogDb.from('blog_posts').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data as BlogPost;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await blogDb.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Publish (optionally scheduled for a future `publishedAt`) or unpublish. Unpublishing
 * never clears `published_at` — the before-write trigger only stamps it the first time a
 * post goes live, so the original publish date survives a later re-publish.
 */
export async function setPostStatus(
  id: string,
  status: BlogPostStatus,
  publishedAt?: string,
): Promise<BlogPost> {
  const patch: Partial<BlogPostInput> & { published_at?: string } = { status };
  if (status === 'published' && publishedAt) {
    patch.published_at = publishedAt;
  }
  const { data, error } = await blogDb.from('blog_posts').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data as BlogPost;
}

const UNIQUE_VIOLATION = '23505';

export function isUniqueSlugViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  return code === UNIQUE_VIOLATION;
}

export function friendlySaveError(error: unknown): string {
  if (isUniqueSlugViolation(error)) {
    return 'That slug is already in use by another post. Choose a different one.';
  }
  return error instanceof Error ? error.message : 'Something went wrong while saving.';
}

// -- Bloggers (blog_authors) ---------------------------------------------------

export interface BlogAuthorWithProfile extends BlogAuthor {
  profile: { name: string; email: string | null } | null;
}

export async function listAuthorsAdmin(): Promise<BlogAuthorWithProfile[]> {
  const { data, error } = await blogDb
    .from('blog_authors')
    .select('*, profile:profiles(name, email)')
    .order('display_name');
  if (error) throw error;
  return (data ?? []) as unknown as BlogAuthorWithProfile[];
}

export async function listActiveAuthorsForSelect(): Promise<Pick<BlogAuthor, 'user_id' | 'display_name'>[]> {
  const { data, error } = await blogDb
    .from('blog_authors')
    .select('user_id, display_name')
    .eq('is_active', true)
    .order('display_name');
  if (error) throw error;
  return data ?? [];
}

export interface EligibleProfile {
  id: string;
  name: string;
  email: string | null;
}

/** Profiles that do not already have a blog_authors row (active or revoked). */
export async function searchEligibleProfiles(query: string): Promise<EligibleProfile[]> {
  const { data: existing, error: existingError } = await blogDb.from('blog_authors').select('user_id');
  if (existingError) throw existingError;
  const excluded = new Set((existing ?? []).map((row: { user_id: string }) => row.user_id));

  let q = blogDb.from('profiles').select('id, name, email').order('name').limit(25);
  const trimmed = query.trim();
  if (trimmed) {
    const escaped = trimmed.replace(/[%,]/g, '');
    q = q.or(`name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as EligibleProfile[]).filter((profile) => !excluded.has(profile.id));
}

export interface GrantBlogAuthorInput {
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  granted_by: string;
}

export async function grantBlogAuthor(input: GrantBlogAuthorInput): Promise<BlogAuthor> {
  const { data, error } = await blogDb.from('blog_authors').insert(input).select().single();
  if (error) throw error;
  return data as BlogAuthor;
}

export type BlogAuthorAdminPatch = Partial<Pick<BlogAuthor, 'display_name' | 'bio' | 'avatar_url' | 'is_active'>>;

export async function updateBlogAuthorAdmin(userId: string, patch: BlogAuthorAdminPatch): Promise<BlogAuthor> {
  const { data, error } = await blogDb.from('blog_authors').update(patch).eq('user_id', userId).select().single();
  if (error) throw error;
  return data as BlogAuthor;
}

/** Self-service update. RLS + the guard trigger reject anything but avatar_url/bio. */
export async function updateOwnBlogAuthorProfile(
  userId: string,
  patch: { bio?: string | null; avatar_url?: string | null },
): Promise<BlogAuthor> {
  const { data, error } = await blogDb.from('blog_authors').update(patch).eq('user_id', userId).select().single();
  if (error) throw error;
  return data as BlogAuthor;
}

export async function getOwnBlogAuthor(userId: string): Promise<BlogAuthor | null> {
  const { data, error } = await blogDb.from('blog_authors').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data as BlogAuthor | null) ?? null;
}

// -- Storage --------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function assertValidImageFile(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPEG, PNG, WebP, GIF, or AVIF image.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Images must be 10MB or smaller.');
  }
}

function extensionFor(file: File): string {
  const fromName = file.name.split('.').pop();
  if (fromName && /^[a-z0-9]{2,5}$/i.test(fromName)) return fromName.toLowerCase();
  const fromType = file.type.split('/').pop();
  return fromType ? fromType.toLowerCase() : 'bin';
}

/**
 * Uploads under `<authorId>/...` so storage RLS (which keys on the first path
 * segment being the uploader's own uid) accepts it for bloggers; admins bypass
 * the folder check entirely. `folder` nests a purpose, e.g. 'avatars'.
 */
export async function uploadBlogImage(authorId: string, file: File, folder?: string): Promise<string> {
  assertValidImageFile(file);
  const path = `${authorId}/${folder ? `${folder}/` : ''}${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await blogDb.storage.from(BLOG_IMAGES_BUCKET).upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = blogDb.storage.from(BLOG_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
