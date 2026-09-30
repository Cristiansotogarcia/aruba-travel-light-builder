import { useEffect, useMemo, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  AVATAR_ASPECT,
  AVATAR_EXPORT_SIZE,
  BODY_ASPECT_PRESETS,
  BODY_MAX_LONG_SIDE,
  COVER_ASPECT,
  COVER_EXPORT_SIZE,
  blobToJpegFile,
  cropImageToBlob,
  loadImage,
  type ExportConstraint,
} from '@/lib/blog/imageCrop';

export type CropVariant = 'cover' | 'avatar' | 'body';

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The just-picked source file, before any cropping. */
  file: File | null;
  variant: CropVariant;
  /** Base filename for the exported .jpg, e.g. "cover" or "avatar". */
  fileName?: string;
  onCropped: (file: File) => void;
}

const VARIANT_COPY: Record<CropVariant, { title: string; hint: string }> = {
  cover: { title: 'Crop cover image', hint: 'Cover images are cropped to 1200x630 for the post and social previews.' },
  avatar: { title: 'Crop photo', hint: 'Photos are cropped to a 512x512 square.' },
  body: { title: 'Crop image', hint: 'Pick a shape, then position and zoom the image.' },
};

/**
 * Shared crop step for the three places the owner asked for one: the post
 * cover image, images inserted into the post body, and the blogger avatar.
 * Wraps react-easy-crop for the interactive part and src/lib/blog/imageCrop
 * for the canvas export.
 */
export const ImageCropDialog = ({ open, onOpenChange, file, variant, fileName, onCropped }: ImageCropDialogProps) => {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalAspect, setNaturalAspect] = useState(1);
  const [presetId, setPresetId] = useState<(typeof BODY_ASPECT_PRESETS)[number]['id']>('free');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!file) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setPresetId('free');
    setCroppedAreaPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const aspect = useMemo(() => {
    if (variant === 'cover') return COVER_ASPECT;
    if (variant === 'avatar') return AVATAR_ASPECT;
    const preset = BODY_ASPECT_PRESETS.find((option) => option.id === presetId);
    return preset?.value ?? naturalAspect;
  }, [variant, presetId, naturalAspect]);

  const constraint: ExportConstraint = useMemo(() => {
    if (variant === 'cover') return COVER_EXPORT_SIZE;
    if (variant === 'avatar') return AVATAR_EXPORT_SIZE;
    return { maxLongSide: BODY_MAX_LONG_SIDE };
  }, [variant]);

  const copy = VARIANT_COPY[variant];

  const handleConfirm = async () => {
    if (!file || !imageUrl || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const image = await loadImage(file);
      const blob = await cropImageToBlob(image, croppedAreaPixels, constraint);
      const outFile = blobToJpegFile(blob, `${fileName ?? variant}.jpg`);
      onCropped(outFile);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Could not crop that image',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>

        {variant === 'body' && (
          <div className="flex flex-wrap gap-1.5">
            {BODY_ASPECT_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={presetId === preset.id ? 'default' : 'outline'}
                onClick={() => setPresetId(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        )}

        {imageUrl && (
          <div
            className={cn(
              'relative h-72 w-full overflow-hidden rounded-md bg-muted',
              variant === 'avatar' && 'h-64',
            )}
          >
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={variant === 'avatar' ? 'round' : 'rect'}
              showGrid={variant !== 'avatar'}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
              onMediaLoaded={(mediaSize) => {
                if (mediaSize.naturalHeight > 0) {
                  setNaturalAspect(mediaSize.naturalWidth / mediaSize.naturalHeight);
                }
              }}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{copy.hint}</p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.05}
              onValueChange={([value]) => setZoom(value)}
              className="flex-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!croppedAreaPixels || processing}>
            {processing ? 'Cropping…' : 'Crop & use'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropDialog;
