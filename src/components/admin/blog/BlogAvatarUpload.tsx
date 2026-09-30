import { useRef, useState } from 'react';
import { Upload, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { assertValidImageFile, uploadBlogImage } from './blogAdminApi';
import { ImageCropDialog } from './ImageCropDialog';

interface BlogAvatarUploadProps {
  /** The blogger this photo belongs to — uploads land under `<authorId>/avatars/...`. */
  authorId: string;
  avatarUrl: string | null;
  displayName: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
}

/** Round photo preview + upload, reused by the admin Bloggers tab and the blogger's own studio profile card. */
export const BlogAvatarUpload = ({ authorId, avatarUrl, displayName, onUploaded, disabled }: BlogAvatarUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const { toast } = useToast();

  const handleFile = (file: File | undefined) => {
    if (!file) return;
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
    setPendingFile(file);
    setCropOpen(true);
  };

  const handleCropped = async (croppedFile: File) => {
    setUploading(true);
    try {
      const url = await uploadBlogImage(authorId, croppedFile, 'avatars');
      onUploaded(url);
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Could not upload the photo.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      setPendingFile(null);
    }
  };

  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-16 w-16 border">
        <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
        <AvatarFallback>{initials || <User className="h-6 w-6" />}</AvatarFallback>
      </Avatar>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            // Reset so picking the same file again after cancelling the crop still fires.
            event.target.value = '';
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? 'Uploading…' : 'Change photo'}
        </Button>
        <p className="mt-1 text-xs text-muted-foreground">JPEG, PNG, WebP, GIF, or AVIF. Up to 10MB.</p>
      </div>
      <ImageCropDialog
        open={cropOpen}
        onOpenChange={(next) => {
          setCropOpen(next);
          if (!next) setPendingFile(null);
        }}
        file={pendingFile}
        variant="avatar"
        fileName="avatar"
        onCropped={handleCropped}
      />
    </div>
  );
};

export default BlogAvatarUpload;
