import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { BLOG_BIO_MAX } from '@/lib/blog/types';

interface BlogBioFieldProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  label?: string;
  disabled?: boolean;
}

/** Shared bio textarea + live counter, enforced client-side and by the DB check. */
export const BlogBioField = ({ value, onChange, id = 'blog-bio', label = 'Bio', disabled }: BlogBioFieldProps) => {
  const remaining = BLOG_BIO_MAX - value.length;
  const overLimit = remaining < 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value.slice(0, BLOG_BIO_MAX))}
        maxLength={BLOG_BIO_MAX}
        rows={3}
        placeholder="A short line shown next to the byline on published posts."
      />
      <p className={cn('text-xs', overLimit ? 'text-destructive' : 'text-muted-foreground')}>
        {value.length}/{BLOG_BIO_MAX} characters
      </p>
    </div>
  );
};

export default BlogBioField;
