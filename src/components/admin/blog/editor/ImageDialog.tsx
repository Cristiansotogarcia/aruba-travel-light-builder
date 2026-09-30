import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { assertValidImageFile, uploadBlogImage } from '../blogAdminApi';

interface ImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor;
  authorId: string | null;
}

export const ImageDialog = ({ open, onOpenChange, editor, authorId }: ImageDialogProps) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setFile(null);
    setUrl('');
    setAlt('');
    setTab('upload');
  };

  const insert = (src: string) => {
    editor.chain().focus().setImage({ src, alt: alt.trim() || undefined }).run();
    reset();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    if (tab === 'url') {
      if (!url.trim()) return;
      insert(url.trim());
      return;
    }
    if (!file || !authorId) return;
    try {
      assertValidImageFile(file);
    } catch (error) {
      toast({
        title: 'Invalid image',
        description: error instanceof Error ? error.message : 'Please choose a different image.',
        variant: 'destructive',
      });
      return;
    }
    setUploading(true);
    try {
      const publicUrl = await uploadBlogImage(authorId, file);
      insert(publicUrl);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload the image.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const canConfirm = tab === 'url' ? !!url.trim() : !!file && !uploading;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'upload' | 'url')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="url">Image URL</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-1.5">
            <Label htmlFor="editor-image-file">Choose a file</Label>
            <Input
              id="editor-image-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">JPEG, PNG, WebP, GIF, or AVIF. Up to 10MB.</p>
          </TabsContent>
          <TabsContent value="url" className="space-y-1.5">
            <Label htmlFor="editor-image-url">Image URL</Label>
            <Input
              id="editor-image-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
          </TabsContent>
        </Tabs>
        <div className="space-y-1.5">
          <Label htmlFor="editor-image-alt">Alt text</Label>
          <Input
            id="editor-image-alt"
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
            placeholder="Describe the image for screen readers"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {uploading ? 'Uploading…' : 'Insert'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageDialog;
