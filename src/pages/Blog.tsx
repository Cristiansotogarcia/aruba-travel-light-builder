import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SEO } from '@/components/common/SEO';
import { BlogCard } from '@/components/blog/BlogCard';
import { listPublishedPosts } from '@/lib/blog/api';

const PAGE_SIZE = 9;

export function parseBlogPage(value: string | null) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : 1;
}

const Blog = () => {
  const [params] = useSearchParams();
  const page = parseBlogPage(params.get('page'));
  const tag = params.get('tag')?.trim().slice(0, 80) || undefined;
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['blog-public', page, tag],
    queryFn: () => listPublishedPosts({ page, pageSize: PAGE_SIZE, tag }),
  });
  const { data: topics } = useQuery({
    queryKey: ['blog-public-topics'],
    queryFn: () => listPublishedPosts({ pageSize: 100 }),
  });
  const posts = data?.posts ?? [];
  const featured = page === 1 && !tag ? posts[0] : null;
  const cards = featured ? posts.slice(1) : posts;
  const tags = [...new Set([...(topics?.posts ?? posts).flatMap(post => post.tags), ...(tag ? [tag] : [])])].sort((a, b) => a.localeCompare(b));
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);
  const pageUrl = (next: number) => {
    const query = new URLSearchParams();
    if (tag) query.set('tag', tag);
    if (next > 1) query.set('page', String(next));
    return `/blog${query.size ? `?${query}` : ''}`;
  };

  return <div className="min-h-screen flex flex-col">
    <SEO title="The Aruba Journal | Travel Light Aruba" description="Local stories, family travel advice and thoughtful ways to enjoy Aruba." url="https://travelightaruba.com/blog" />
    <Header />
    <main className="flex-1">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <div className="mb-10 max-w-3xl">
          <p className="mb-4 text-sm font-semibold text-sky-800">The Aruba Journal</p>
          <h1 className="font-display text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">A lighter way to experience Aruba.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">Island notes, helpful travel ideas, and stories for making more of every day here.</p>
        </div>
        {isPending ? <p role="status" className="py-20 text-muted-foreground">Loading stories…</p> : isError ? (
          <div role="alert" className="rounded-2xl bg-white p-10"><h2 className="font-display text-2xl">Stories are unavailable right now.</h2><p className="mt-2 text-muted-foreground">Please try again in a moment.</p><button type="button" onClick={() => refetch()} className="mt-5 min-h-11 rounded-lg bg-foreground px-5 text-background">Try again</button></div>
        ) : <>
          {tags.length > 0 && <nav aria-label="Filter blog by topic" className="mb-8 flex flex-wrap gap-2"><Link to="/blog" aria-current={!tag ? 'page' : undefined} className={`rounded-full px-4 py-2 text-sm font-medium ${!tag ? 'bg-foreground text-background' : 'bg-white hover:bg-secondary'}`}>All stories</Link>{tags.map(item => <Link key={item} to={`/blog?tag=${encodeURIComponent(item)}`} aria-current={tag === item ? 'page' : undefined} className={`rounded-full px-4 py-2 text-sm font-medium ${tag === item ? 'bg-foreground text-background' : 'bg-white hover:bg-secondary'}`}>{item}</Link>)}</nav>}
          {featured && <div className="mb-8"><BlogCard post={featured} featured /></div>}
          {cards.length > 0 && <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{cards.map(post => <BlogCard key={post.id} post={post} />)}</div>}
          {posts.length === 0 && <div className="rounded-2xl bg-white px-6 py-16 text-center"><h2 className="font-display text-3xl">{tag ? 'No stories in this topic yet.' : page > 1 ? 'No more stories on this page.' : 'Our first stories are on their way.'}</h2><p className="mt-3 text-muted-foreground">{tag || page > 1 ? 'Explore all stories instead.' : 'Check back soon for island inspiration.'}</p>{(tag || page > 1) && <Link to="/blog" className="mt-5 inline-block font-semibold underline underline-offset-4">All stories</Link>}</div>}
          {totalPages > 1 && <nav aria-label="Blog pages" className="mt-12 flex items-center justify-center gap-4">{page > 1 && <Link to={pageUrl(page - 1)} className="rounded-lg border bg-white px-5 py-3 font-medium">Previous</Link>}<span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>{page < totalPages && <Link to={pageUrl(page + 1)} className="rounded-lg border bg-white px-5 py-3 font-medium">Next</Link>}</nav>}
        </>}
      </div>
    </main>
    <Footer />
  </div>;
};

export default Blog;
