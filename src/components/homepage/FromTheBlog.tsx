import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listPublishedPosts } from '@/lib/blog/api';
import { BlogCard } from '@/components/blog/BlogCard';

export function FromTheBlog() {
  const { data } = useQuery({
    queryKey: ['blog-home-teaser'],
    queryFn: () => listPublishedPosts({ pageSize: 3 }),
  });
  if (!data?.posts.length) return null;

  return <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-labelledby="from-blog-title">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-semibold text-sky-800">The Aruba Journal</p><h2 id="from-blog-title" className="font-display text-3xl sm:text-4xl">From the blog</h2></div><Link to="/blog" className="font-semibold underline underline-offset-4">Explore all stories</Link></div>
    <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">{data.posts.map(post => <BlogCard key={post.id} post={post} />)}</div>
  </section>;
}
