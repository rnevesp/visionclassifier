import { describe, expect, it } from 'vitest';
import { MODEL_URL_HINT, resolveModelUrl } from './modelUrl';

const TM = 'https://teachablemachine.withgoogle.com/models/-kkN11hJF/';

describe('resolveModelUrl', () => {
  it('accepts a Teachable Machine share link with a trailing slash', () => {
    const r = resolveModelUrl(TM);
    expect(r).toEqual({
      ok: true,
      value: { modelUrl: TM + 'model.json', metadataUrl: TM + 'metadata.json', displayUrl: TM },
    });
  });

  it('normalises missing slash, model.json, metadata.json, whitespace and query strings', () => {
    for (const input of [
      TM.slice(0, -1),
      TM + 'model.json',
      TM + 'metadata.json',
      `  ${TM}  `,
      TM + '?utm=1',
      TM + 'model.json#x',
    ]) {
      const r = resolveModelUrl(input);
      expect(r.ok, input).toBe(true);
      if (r.ok) expect(r.value.displayUrl).toBe(TM);
    }
  });

  it('rejects Teachable Machine links that are not model folders', () => {
    for (const input of [
      'https://teachablemachine.withgoogle.com/',
      'https://teachablemachine.withgoogle.com/train/image',
      'https://teachablemachine.withgoogle.com/models/',
      'https://teachablemachine.withgoogle.com/models/a/b/',
    ]) {
      const r = resolveModelUrl(input);
      expect(r.ok, input).toBe(false);
    }
  });

  it('accepts a custom http(s) host folder', () => {
    const r = resolveModelUrl('https://example.com/my-model/model.json');
    expect(r).toEqual({
      ok: true,
      value: {
        modelUrl: 'https://example.com/my-model/model.json',
        metadataUrl: 'https://example.com/my-model/metadata.json',
        displayUrl: 'https://example.com/my-model/',
      },
    });
    expect(resolveModelUrl('http://localhost:8080').ok).toBe(true);
  });

  it('accepts local preset paths', () => {
    const r = resolveModelUrl('/models/chest-xray/');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.modelUrl).toBe('/models/chest-xray/model.json');
      expect(r.value.metadataUrl).toBe('/models/chest-xray/metadata.json');
    }
    expect(resolveModelUrl('/models/chest-xray/model.json').ok).toBe(true);
    expect(resolveModelUrl('/models/').ok).toBe(false);
  });

  it('rejects empty input with a distinct message', () => {
    const r = resolveModelUrl('   ');
    expect(r).toEqual({ ok: false, error: 'Enter a model URL' });
  });

  it('rejects garbage and non-http schemes with the hint', () => {
    for (const input of ['not a url', 'ftp://example.com/m/', 'file:///C:/m/', 'javascript:alert(1)']) {
      const r = resolveModelUrl(input);
      expect(r.ok, input).toBe(false);
      if (!r.ok) expect(r.error).toContain(MODEL_URL_HINT);
    }
  });
});
