import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { isValidYoutubeUrl } from '@tiptap/extension-youtube';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface YoutubeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor;
}

export const YoutubeDialog = ({ open, onOpenChange, editor }: YoutubeDialogProps) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    const trimmed = url.trim();
    if (!isValidYoutubeUrl(trimmed)) {
      setError('That does not look like a YouTube link.');
      return;
    }
    editor.commands.setYoutubeVideo({ src: trimmed });
    setUrl('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setUrl('');
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Embed a YouTube video</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="editor-youtube-url">Video URL</Label>
          <Input
            id="editor-youtube-url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError(null);
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!url.trim()}>
            Embed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default YoutubeDialog;
