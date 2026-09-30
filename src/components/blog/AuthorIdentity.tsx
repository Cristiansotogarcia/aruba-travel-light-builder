import { useState } from 'react';
import { BLOG_BIO_MAX, type BlogByline } from '@/lib/blog/types';

export function AuthorIdentity({ author, compact = false, byline = false }: { author: BlogByline | null; compact?: boolean; byline?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const name = author?.display_name?.trim() || 'Travel Light Aruba';
  const bio = author?.bio?.trim().slice(0, BLOG_BIO_MAX) || 'Stories from the Travel Light Aruba team.';
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const avatarUrl = author?.avatar_url;

  return <div className={`flex items-center ${compact ? 'gap-2.5' : 'gap-4'}`}>
    {avatarUrl && failedUrl !== avatarUrl ? <img src={avatarUrl} alt="" loading="lazy" onError={() => setFailedUrl(avatarUrl)} className={`${compact ? 'h-9 w-9' : 'h-16 w-16'} shrink-0 rounded-full object-cover`} /> : <span aria-hidden="true" className={`${compact ? 'h-9 w-9 text-xs' : 'h-16 w-16 text-lg'} flex shrink-0 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-900`}>{initials}</span>}
    <div><p className="font-semibold text-foreground">{byline ? 'By ' : ''}{name}</p>{!compact && <p className="mt-1 leading-relaxed text-muted-foreground">{bio}</p>}</div>
  </div>;
}
