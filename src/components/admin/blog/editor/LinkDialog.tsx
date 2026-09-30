import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor;
}

const ALLOWED_LINK_PROTOCOL = /^(https?:|mailto:)/i;

export const LinkDialog = ({ open, onOpenChange, editor }: LinkDialogProps) => {
  const [href, setHref] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setHref(editor.getAttributes('link').href ?? '');
      setError(null);
    }
  }, [open, editor]);

  const handleSubmit = () => {
    const trimmed = href.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      onOpenChange(false);
      return;
    }
    if (!ALLOWED_LINK_PROTOCOL.test(trimmed)) {
      setError('Links must start with http://, https://, or mailto:');
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: trimmed, target: '_blank' })
      .run();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="editor-link-href">URL</Label>
          <Input
            id="editor-link-href"
            value={href}
            onChange={(event) => {
              setHref(event.target.value);
              setError(null);
            }}
            placeholder="https://example.com or mailto:hello@example.com"
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{href.trim() ? 'Apply' : 'Remove link'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkDialog;
