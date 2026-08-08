/**
 * Client-only image processing for the admin Products edit dialog. There is
 * no backend and no storage — every uploaded photo is downscaled and
 * re-encoded in the browser, and only the small result ever touches React
 * state (see ProductOverride.imageDataUrl in lib/admin.ts). The raw file and
 * its full-size FileReader output are used transiently inside
 * `processImageFile` and then discarded.
 */

/** Reject anything above this before even reading it — a generous ceiling for
 * a phone photo, but well short of something that would stall the tab. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Long edge of the re-encoded image, in pixels. */
const MAX_DIMENSION = 800;

const ENCODE_QUALITY = 0.85;

export class ImageProcessingError extends Error {}

/**
 * Validates, reads, downscales (canvas, long edge <= 800px) and re-encodes
 * (webp, falling back to jpeg if the browser's canvas refuses webp) an
 * uploaded image file, returning a small data URL suitable for
 * ProductOverride.imageDataUrl. Throws ImageProcessingError with a
 * user-facing message on anything that goes wrong.
 */
export async function processImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new ImageProcessingError('Please choose an image file (JPEG, PNG, WEBP, etc.).');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageProcessingError(
      `That image is ${(file.size / (1024 * 1024)).toFixed(1)} MB — please choose one under ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
    );
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(rawDataUrl);

  const { width, height } = fitWithin(image.naturalWidth || image.width, image.naturalHeight || image.height, MAX_DIMENSION);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new ImageProcessingError('This browser cannot process images — try a different device or browser.');
  }
  ctx.drawImage(image, 0, 0, width, height);

  return encodeCanvas(canvas);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new ImageProcessingError('Could not read that file.'));
    };
    reader.onerror = () => reject(new ImageProcessingError('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageProcessingError('That file could not be read as an image.'));
    img.src = src;
  });
}

function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: max, height: max };
  if (width <= max && height <= max) return { width, height };
  const scale = width >= height ? max / width : max / height;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Encodes as webp; if the browser silently substitutes a different type
 * (the canvas spec's documented behavior when a requested type isn't
 * supported), falls back to jpeg, which every canvas implementation supports. */
function encodeCanvas(canvas: HTMLCanvasElement): string {
  const webp = canvas.toDataURL('image/webp', ENCODE_QUALITY);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/jpeg', ENCODE_QUALITY);
}
