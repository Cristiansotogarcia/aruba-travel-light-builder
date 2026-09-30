-- Blog: authors (per-user blogging permission), posts, and an image bucket.
--
-- Permission model: a user may blog only while they have an ACTIVE row in
-- blog_authors. Only Admin/SuperUser can grant, rename or revoke. The byline
-- shown on the website is blog_authors.display_name, and a blogger can only
-- write posts whose author_id is their own user id, so a byline cannot be
-- claimed by anyone else. Admin/SuperUser may write on behalf of any author.
--
-- This file is identical on main and test_environment; both branches use the
-- same Supabase project, so it is applied once.

-- Helpers ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.blog_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('Admin', 'SuperUser')
      AND coalesce(p.is_deactivated, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_blog_author()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blog_authors a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.user_id = auth.uid()
      AND a.is_active = true
      AND coalesce(p.is_deactivated, false) = false
  );
$$;

-- Tables -----------------------------------------------------------------------

CREATE TABLE public.blog_authors (
  user_id      uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 80),
  bio          text CHECK (bio IS NULL OR char_length(bio) <= 140),
  avatar_url   text,
  is_active    boolean NOT NULL DEFAULT true,
  granted_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.blog_posts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        uuid NOT NULL REFERENCES public.blog_authors(user_id) ON DELETE RESTRICT,
  title            text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  slug             text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 120),
  excerpt          text CHECK (excerpt IS NULL OR char_length(excerpt) <= 400),
  content_json     jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_html     text NOT NULL DEFAULT '',
  cover_image_url  text,
  cover_image_alt  text,
  tags             text[] NOT NULL DEFAULT '{}',
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at     timestamptz,
  reading_minutes  integer NOT NULL DEFAULT 1 CHECK (reading_minutes >= 1),
  seo_title        text CHECK (seo_title IS NULL OR char_length(seo_title) <= 70),
  seo_description  text CHECK (seo_description IS NULL OR char_length(seo_description) <= 170),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blog_posts_published_idx ON public.blog_posts (status, published_at DESC);
CREATE INDEX blog_posts_author_idx ON public.blog_posts (author_id);
CREATE INDEX blog_posts_tags_idx ON public.blog_posts USING gin (tags);

-- Timestamps -------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.blog_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blog_authors_updated_at
  BEFORE UPDATE ON public.blog_authors
  FOR EACH ROW EXECUTE FUNCTION public.blog_touch_updated_at();

-- Publishing stamps published_at the first time a post goes live; unpublishing
-- keeps it so the original date survives a re-publish.
CREATE OR REPLACE FUNCTION public.blog_posts_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blog_posts_before_write
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.blog_posts_before_write();

-- RLS: blog_authors ------------------------------------------------------------

ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;

-- Bylines are public for active authors.
CREATE POLICY blog_authors_public_read ON public.blog_authors
  FOR SELECT USING (is_active = true);

-- An author can always see their own row (also when revoked).
CREATE POLICY blog_authors_self_read ON public.blog_authors
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- A blogger maintains their own photo and bio. The byline name, the active
-- flag and who granted access stay admin-only (enforced by the trigger below).
CREATE POLICY blog_authors_self_update ON public.blog_authors
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND is_active = true)
  WITH CHECK (user_id = auth.uid() AND is_active = true);

CREATE OR REPLACE FUNCTION public.blog_authors_guard_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.blog_is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.display_name IS DISTINCT FROM OLD.display_name
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.granted_by IS DISTINCT FROM OLD.granted_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only an administrator can change the byline name or blogging access';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blog_authors_guard_self_edit
  BEFORE UPDATE ON public.blog_authors
  FOR EACH ROW EXECUTE FUNCTION public.blog_authors_guard_self_edit();

CREATE POLICY blog_authors_admin_all ON public.blog_authors
  FOR ALL TO authenticated
  USING (public.blog_is_admin())
  WITH CHECK (public.blog_is_admin());

-- RLS: blog_posts --------------------------------------------------------------

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY blog_posts_public_read ON public.blog_posts
  FOR SELECT USING (status = 'published' AND published_at <= now());

CREATE POLICY blog_posts_author_read ON public.blog_posts
  FOR SELECT TO authenticated
  USING (author_id = auth.uid() AND public.is_blog_author());

CREATE POLICY blog_posts_author_insert ON public.blog_posts
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.is_blog_author());

CREATE POLICY blog_posts_author_update ON public.blog_posts
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.is_blog_author())
  WITH CHECK (author_id = auth.uid() AND public.is_blog_author());

CREATE POLICY blog_posts_author_delete ON public.blog_posts
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() AND public.is_blog_author());

CREATE POLICY blog_posts_admin_all ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.blog_is_admin())
  WITH CHECK (public.blog_is_admin());

GRANT SELECT ON public.blog_authors, public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_authors, public.blog_posts TO authenticated;
GRANT EXECUTE ON FUNCTION public.blog_is_admin(), public.is_blog_author() TO anon, authenticated;

-- Storage: blog-images (public read, authors and admins write) -----------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images', 'blog-images', true, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY blog_images_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

-- Authors upload under a folder named after their own user id.
CREATE POLICY blog_images_author_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'blog-images'
    AND (
      public.blog_is_admin()
      OR (public.is_blog_author() AND (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

CREATE POLICY blog_images_author_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'blog-images'
    AND (
      public.blog_is_admin()
      OR (public.is_blog_author() AND (storage.foldername(name))[1] = auth.uid()::text)
    )
  );
