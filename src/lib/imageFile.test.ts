import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_BYTES, validateImageFile } from './imageFile';

describe('validateImageFile', () => {
  it('accepts a normal image', () => {
    expect(validateImageFile({ name: 'x.jpg', type: 'image/jpeg', size: 1024 })).toEqual({ ok: true, value: true });
  });

  it('rejects non-images by MIME type', () => {
    const r = validateImageFile({ name: 'x.pdf', type: 'application/pdf', size: 10 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not an image/);
  });

  it('falls back to the extension when the MIME type is empty', () => {
    expect(validateImageFile({ name: 'photo.PNG', type: '', size: 10 }).ok).toBe(true);
    expect(validateImageFile({ name: 'notes.txt', type: '', size: 10 }).ok).toBe(false);
  });

  it('rejects oversize files and names both sizes', () => {
    const r = validateImageFile({ name: 'big.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/10\.0 MB.*10 MB/);
  });

  it('accepts a file exactly at the limit', () => {
    expect(validateImageFile({ name: 'ok.png', type: 'image/png', size: MAX_IMAGE_BYTES }).ok).toBe(true);
  });

  it('honours a custom limit', () => {
    expect(validateImageFile({ name: 'ok.png', type: 'image/png', size: 2 }, 1).ok).toBe(false);
  });
});
