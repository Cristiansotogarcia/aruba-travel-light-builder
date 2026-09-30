// Crop math + canvas rendering shared by the cover image, body image, and
// avatar upload flows (owner feedback: "no image resizer or crop"). The pure
// sizing calculation is exported separately from the canvas/DOM work below so
// it can be unit tested without a browser canvas implementation.

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExactSize {
  width: number;
  height: number;
}

export interface MaxLongSide {
  maxLongSide: number;
}

export type ExportConstraint = ExactSize | MaxLongSide;

/** JPEG encode quality used for every cropped export. */
export const CROP_JPEG_QUALITY = 0.85;

/** Cover image: fixed social/og aspect, exported at an exact size. */
export const COVER_ASPECT = 1200 / 630;
export const COVER_EXPORT_SIZE: ExactSize = { width: 1200, height: 630 };

/** Blogger/author avatar: square, round preview, exported at an exact size. */
export const AVATAR_ASPECT = 1;
export const AVATAR_EXPORT_SIZE: ExactSize = { width: 512, height: 512 };

/** Body images: user picks the aspect, we only cap the longest side. */
export const BODY_MAX_LONG_SIDE = 1600;

export interface AspectPreset {
  id: 'free' | 'wide' | 'standard' | 'square';
  label: string;
  /** undefined means "use the image's own aspect ratio" (no forced crop shape). */
  value: number | undefined;
}

export const BODY_ASPECT_PRESETS: AspectPreset[] = [
  { id: 'free', label: 'Free', value: undefined },
  { id: 'wide', label: '16:9', value: 16 / 9 },
  { id: 'standard', label: '4:3', value: 4 / 3 },
  { id: 'square', label: '1:1', value: 1 },
];

function isExactSize(constraint: ExportConstraint): constraint is ExactSize {
  return 'width' in constraint && 'height' in constraint;
}

/**
 * The pixel dimensions to render a crop at. An exact-size constraint (cover,
 * avatar) always wins as-is — react-easy-crop already constrained the crop
 * rectangle to that aspect ratio, so this only resamples it to the fixed
 * output size. A maxLongSide constraint (body images) downscales
 * proportionally and never upscales past the source crop.
 */
export function computeExportSize(crop: PixelCrop, constraint: ExportConstraint): ExactSize {
  if (isExactSize(constraint)) {
    return { width: constraint.width, height: constraint.height };
  }
  const longSide = Math.max(crop.width, crop.height);
  const scale = longSide > 0 ? Math.min(1, constraint.maxLongSide / longSide) : 1;
  return {
    width: Math.max(1, Math.round(crop.width * scale)),
    height: Math.max(1, Math.round(crop.height * scale)),
  };
}

/**
 * Draws the cropped region of `image` onto an offscreen canvas at the
 * computed export size and encodes it as a JPEG blob. This is the DOM-facing
 * half (HTMLCanvasElement, toBlob) and is exercised by the upload components
 * rather than unit-tested directly — see computeExportSize above for the
 * math it depends on.
 */
export async function cropImageToBlob(
  image: CanvasImageSource,
  crop: PixelCrop,
  constraint: ExportConstraint,
  quality: number = CROP_JPEG_QUALITY,
): Promise<Blob> {
  const { width, height } = computeExportSize(crop, constraint);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  // JPEG has no alpha channel: transparent pixels would encode as black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Could not export the cropped image.'));
      },
      'image/jpeg',
      quality,
    );
  });
}

/** Loads a File/Blob into an HTMLImageElement so it can be drawn to canvas. */
export function loadImage(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    image.src = url;
  });
}

/** Wraps a cropped blob as a File so it can go through the existing upload
 * helpers (assertValidImageFile, uploadBlogImage) unchanged. */
export function blobToJpegFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: 'image/jpeg' });
}
