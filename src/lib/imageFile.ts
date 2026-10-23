import { fail, ok, type Result } from './types';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|bmp|avif)$/i;

/** The subset of File the validator needs, so tests can pass plain objects. */
export interface FileLike {
  name: string;
  type: string;
  size: number;
}

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(bytes % (1024 * 1024) === 0 ? 0 : 1) + ' MB';
}

/**
 * Checks that a dropped or picked file is an image the browser can decode and
 * is within the size limit. Falls back to the extension when the browser
 * reports no MIME type (happens with some drag sources on Windows).
 */
export function validateImageFile(file: FileLike, maxBytes = MAX_IMAGE_BYTES): Result<true> {
  const looksLikeImage = file.type ? file.type.startsWith('image/') : IMAGE_EXTENSIONS.test(file.name);
  if (!looksLikeImage) return fail('That file is not an image. Use JPG, PNG, GIF or WebP.');
  if (file.size > maxBytes) {
    return fail(`Image is ${formatMegabytes(file.size)}; the limit is ${formatMegabytes(maxBytes)}.`);
  }
  return ok(true);
}
