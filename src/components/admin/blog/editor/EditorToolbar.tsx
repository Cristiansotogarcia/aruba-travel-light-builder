import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Youtube as YoutubeIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ImageDialog } from './ImageDialog';
import { LinkDialog } from './LinkDialog';
import { YoutubeDialog } from './YoutubeDialog';

interface EditorToolbarProps {
  editor: Editor | null;
  /** The post's author uid — inline image uploads land in this folder. */
  authorId: string | null;
}

const ToolbarButton = ({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    className={cn('h-8 w-8', active && 'bg-accent text-accent-foreground')}
  >
    {children}
  </Button>
);

export const EditorToolbar = ({ editor, authorId }: EditorToolbarProps) => {
  const [imageOpen, setImageOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);

  if (!editor) return null;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-lg border-b border-border bg-card/95 p-2 backdrop-blur">
      <ToolbarButton label="Paragraph" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
        <Pilcrow className="h-4 w-4" />
      </ToolbarButton>
      {[2, 3, 4].map((level) => (
        <Button
          key={level}
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={editor.isActive('heading', { level })}
          onClick={() => editor.chain().focus().toggleHeading({ level: level as 2 | 3 | 4 }).run()}
          className={cn('h-8 px-2 text-xs font-semibold', editor.isActive('heading', { level }) && 'bg-accent text-accent-foreground')}
        >
          H{level}
        </Button>
      ))}

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive('link')} onClick={() => setLinkOpen(true)}>
        <Link2 className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <AlignLeft className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <AlignCenter className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <AlignRight className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton label="Insert image" onClick={() => setImageOpen(true)} disabled={!authorId}>
        <ImagePlus className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Embed YouTube video" onClick={() => setYoutubeOpen(true)}>
        <YoutubeIcon className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </ToolbarButton>

      <ImageDialog open={imageOpen} onOpenChange={setImageOpen} editor={editor} authorId={authorId} />
      <LinkDialog open={linkOpen} onOpenChange={setLinkOpen} editor={editor} />
      <YoutubeDialog open={youtubeOpen} onOpenChange={setYoutubeOpen} editor={editor} />
    </div>
  );
};

export default EditorToolbar;
