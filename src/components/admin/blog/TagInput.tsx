import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

const normalize = (raw: string) => raw.trim().toLowerCase();

/** Lowercased chip input for blog_posts.tags (text[]). */
export const TagInput = ({ value, onChange, placeholder = 'Add a tag and press Enter', disabled }: TagInputProps) => {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const tag = normalize(draft);
    setDraft('');
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => onChange(value.filter((existing) => existing !== tag));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-input bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1">
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove tag ${tag}`}
              className="rounded-full hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
      {!disabled && (
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          placeholder={value.length ? '' : placeholder}
          className="h-7 flex-1 min-w-[140px] border-0 p-0 shadow-none focus-visible:ring-0"
        />
      )}
    </div>
  );
};

export default TagInput;
