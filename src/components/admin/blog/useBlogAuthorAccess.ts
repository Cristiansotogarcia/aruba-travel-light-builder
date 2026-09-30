import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { getOwnBlogAuthor } from './blogAdminApi';
import type { BlogAuthor } from '@/lib/blog/types';

/**
 * Whether the signed-in user currently holds an ACTIVE blog_authors row, i.e. can
 * write posts under their own byline. Shared by the "Blog studio" entry point in
 * the app shell and by the BlogStudio page's own access gate.
 */
export function useBlogAuthorAccess() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['blog-author-self', user?.id],
    queryFn: () => getOwnBlogAuthor(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const author: BlogAuthor | null = query.data ?? null;

  return {
    ...query,
    author,
    isBlogger: !!author?.is_active,
  };
}
