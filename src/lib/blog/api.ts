import { blogDb } from './client';
import type { BlogPostSummary, BlogPostWithAuthor } from './types';

const AUTHOR = 'author:blog_authors(display_name, bio, avatar_url)';
const SUMMARY_COLUMNS = `id, author_id, title, slug, excerpt, cover_image_url, cover_image_alt, tags, status, published_at, reading_minutes, seo_title, seo_description, created_at, updated_at, ${AUTHOR}`;

// Public reads. RLS already limits anonymous visitors to published posts whose
// published_at has passed; the explicit filters keep signed-in authors and
// admins (who can also read drafts) seeing the same public list.

export async function listPublishedPosts(opts: { page?: number; pageSize?: number; tag?: string } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? 9;
  const from = (page - 1) * pageSize;
  let q = blogDb
    .from('blog_posts')
    .select(SUMMARY_COLUMNS, { count: 'exact' })
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (opts.tag) q = q.contains('tags', [opts.tag]);
  const { data, error, count } = await q;
  if (error) throw error;
  return { posts: (data ?? []) as unknown as BlogPostSummary[], total: count ?? 0, page, pageSize };
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPostWithAuthor | null> {
  const { data, error } = await blogDb
    .from('blog_posts')
    .select(`*, ${AUTHOR}`)
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as BlogPostWithAuthor) ?? null;
}

export async function listRelatedPosts(post: Pick<BlogPostSummary, 'id' | 'tags'>, limit = 3) {
  let q = blogDb
    .from('blog_posts')
    .select(SUMMARY_COLUMNS)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .neq('id', post.id)
    .order('published_at', { ascending: false })
    .limit(limit);
  if (post.tags.length) q = q.overlaps('tags', post.tags);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as BlogPostSummary[];
}
