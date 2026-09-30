import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from '@dr.pogodin/react-helmet';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/common/SEO';
import { BlogCard } from '@/components/blog/BlogCard';
import { AuthorIdentity } from '@/components/blog/AuthorIdentity';
import { getPublishedPostBySlug, listRelatedPosts } from '@/lib/blog/api';
import { sanitizeBlogHtml } from '@/lib/blog/sanitize';

const SITE_URL = 'https://travelightaruba.com';

const BlogArticle = () => {
  const { slug = '' } = useParams();
  const [shareStatus, setShareStatus] = useState('');
  const { data: post, isPending, isError, refetch } = useQuery({
    queryKey: ['blog-public-post', slug],
    queryFn: () => getPublishedPostBySlug(slug),
    enabled: Boolean(slug),
  });
  const { data: related = [] } = useQuery({
    queryKey: ['blog-related', post?.id],
    queryFn: () => listRelatedPosts({ id: post!.id, tags: post!.tags }),
    enabled: Boolean(post),
  });
  const url = `${SITE_URL}/blog/${encodeURIComponent(slug)}`;
  const date = post?.published_at ? new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(post.published_at)) : '';
  const byline = post?.author?.display_name || 'Travel Light Aruba';
  const share = async () => {
    if (!post) return;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, url }); setShareStatus('Story shared.'); return; }
      catch (error) { if ((error as Error)?.name === 'AbortError') return; }
    }
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(url);
      setShareStatus('Link copied.');
    } catch { setShareStatus('Copy the page address from your browser to share this story.'); }
  };

  return <div className="min-h-screen flex flex-col">
    {post ? <SEO title={post.seo_title || `${post.title} | Travel Light Aruba`} description={post.seo_description || post.excerpt || post.title} image={post.cover_image_url || undefined} url={url} type="article" articleData={{ title: post.title, publishedAt: post.published_at, updatedAt: post.updated_at, author: byline, image: post.cover_image_url }} /> : <Helmet><title>Story not found | Travel Light Aruba</title><meta name="robots" content="noindex, nofollow" /></Helmet>}
    <Header />
    <main className="flex-1">
      {isPending ? <p role="status" className="mx-auto max-w-5xl px-4 py-24">Loading story…</p> : isError ? <div role="alert" className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="font-display text-4xl">This story could not be loaded.</h1><p className="mt-4 text-muted-foreground">Please try again in a moment.</p><button onClick={() => refetch()} className="mt-6 rounded-lg bg-foreground px-5 py-3 text-background">Try again</button></div> : !post ? <div className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="font-display text-5xl">Story not found</h1><p className="mt-5 text-muted-foreground">This story may have moved, or it is not available yet.</p><Link to="/blog" className="mt-8 inline-block font-semibold underline underline-offset-4">Browse the journal</Link></div> : <>
        <article>
          <div className="mx-auto max-w-4xl px-4 pb-10 pt-14 text-center sm:px-6 lg:pt-20">
            <Link to="/blog" className="text-sm font-semibold text-sky-800 hover:underline">The Aruba Journal</Link>
            <h1 className="mt-6 font-display text-4xl leading-tight sm:text-6xl">{post.title}</h1>
            {post.excerpt && <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground"><span>By {byline}</span><span aria-hidden="true">·</span><time dateTime={post.published_at || undefined}>{date}</time><span aria-hidden="true">·</span><span>{post.reading_minutes} min read</span></div>
          </div>
          {post.cover_image_url && <figure className="mx-auto max-w-6xl px-4 sm:px-6"><img src={post.cover_image_url} alt={post.cover_image_alt || ''} className="max-h-[650px] w-full rounded-2xl object-cover" /></figure>}
          <div className="mx-auto max-w-[760px] px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
            <div className="blog-prose prose prose-lg max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:leading-[1.85] prose-a:text-sky-800 prose-img:rounded-xl" dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.content_html) }} />
            {post.tags.length > 0 && <div className="mt-10 flex flex-wrap gap-2">{post.tags.map(tag => <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`} className="rounded-full bg-secondary px-4 py-2 text-sm">{tag}</Link>)}</div>}
            <div className="mt-12 flex items-center justify-between border-t pt-6"><Link to="/blog" className="font-semibold underline underline-offset-4">All stories</Link><button type="button" onClick={share} className="rounded-lg border px-5 py-3 font-semibold hover:bg-secondary">Share story</button></div>
            <p role="status" aria-live="polite" className="mt-2 text-right text-sm text-muted-foreground">{shareStatus}</p>
            <aside className="mt-12 rounded-2xl bg-white p-6" aria-label="About the author"><AuthorIdentity author={post.author} /></aside>
          </div>
        </article>
        {related.length > 0 && <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8" aria-labelledby="more-stories"><h2 id="more-stories" className="mb-7 font-display text-3xl">More from the journal</h2><div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{related.map(item => <BlogCard key={item.id} post={item} />)}</div></section>}
      </>}
    </main>
    <Footer />
  </div>;
};

export default BlogArticle;
