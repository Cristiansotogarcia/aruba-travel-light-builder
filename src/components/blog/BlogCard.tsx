import { Link } from 'react-router-dom';
import type { BlogPostSummary } from '@/lib/blog/types';
import { AuthorIdentity } from './AuthorIdentity';

const publishedDate = (date: string | null) => date
  ? new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(date))
  : '';

export function BlogCard({ post, featured = false }: { post: BlogPostSummary; featured?: boolean }) {
  return (
    <article className={featured ? 'group grid overflow-hidden rounded-[1.5rem] bg-white shadow-sm lg:grid-cols-[1.15fr_1fr]' : 'group overflow-hidden rounded-[1.25rem] bg-white shadow-sm'}>
      <Link to={`/blog/${post.slug}`} className={`block overflow-hidden bg-secondary ${featured ? 'min-h-[260px] lg:min-h-[430px]' : 'aspect-[16/10]'}`} aria-label={`Read ${post.title}`}>
        {post.cover_image_url ? (
          <img src={post.cover_image_url} alt={post.cover_image_alt || ''} loading={featured ? 'eager' : 'lazy'} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
        ) : <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#d7eef2,#f8e5c6)] text-center font-display text-3xl text-foreground/65">Aruba, thoughtfully explored</div>}
      </Link>
      <div className={`flex flex-col ${featured ? 'justify-center p-7 sm:p-10 lg:p-14' : 'p-6'}`}>
        <div className="mb-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <time dateTime={post.published_at || undefined}>{publishedDate(post.published_at)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.reading_minutes} min read</span>
        </div>
        <h2 className={`font-display leading-tight ${featured ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl'}`}>
          <Link to={`/blog/${post.slug}`} className="rounded-sm hover:text-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700">{post.title}</Link>
        </h2>
        {post.excerpt && <p className="mt-4 line-clamp-3 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p>}
        <div className="mt-6"><AuthorIdentity author={post.author} compact /></div>
      </div>
    </article>
  );
}
