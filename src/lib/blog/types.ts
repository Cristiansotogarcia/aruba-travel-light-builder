// Shared blog contract. The admin editor (Claudy) and the public blog pages
// (Plutus) both build on this file; change it only in agreement.

export type BlogPostStatus = 'draft' | 'published';

export interface BlogAuthor {
  user_id: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  is_active: boolean;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

/** The public byline. Never derive it from profiles.name. */
export type BlogByline = Pick<BlogAuthor, 'display_name' | 'bio' | 'avatar_url'>;

export interface BlogPost {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_json: unknown;
  /** Stored sanitized, but ALWAYS re-sanitize with sanitizeBlogHtml before rendering. */
  content_html: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  tags: string[];
  status: BlogPostStatus;
  published_at: string | null;
  reading_minutes: number;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostWithAuthor extends BlogPost {
  author: BlogByline | null;
}

/** List cards carry no body. */
export type BlogPostSummary = Omit<BlogPostWithAuthor, 'content_json' | 'content_html'>;

export type BlogPostInput = Pick<
  BlogPost,
  | 'author_id'
  | 'title'
  | 'slug'
  | 'excerpt'
  | 'content_json'
  | 'content_html'
  | 'cover_image_url'
  | 'cover_image_alt'
  | 'tags'
  | 'status'
  | 'reading_minutes'
  | 'seo_title'
  | 'seo_description'
>;
