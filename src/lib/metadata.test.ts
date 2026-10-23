import { describe, expect, it } from 'vitest';
import { parseMetadata } from './metadata';

const valid = {
  tfjsVersion: '1.7.4',
  tmVersion: '2.4.13',
  packageName: '@teachablemachine/image',
  modelName: 'tm-my-image-model',
  labels: ['Normal', 'Virus', 'Bacteria'],
  imageSize: 224,
};

describe('parseMetadata', () => {
  it('accepts a real Teachable Machine image metadata', () => {
    expect(parseMetadata(valid)).toEqual({
      ok: true,
      value: { labels: ['Normal', 'Virus', 'Bacteria'], imageSize: 224, modelName: 'tm-my-image-model' },
    });
  });

  it('accepts metadata without packageName or modelName', () => {
    const r = parseMetadata({ labels: ['a', 'b'], imageSize: 224 });
    expect(r).toEqual({ ok: true, value: { labels: ['a', 'b'], imageSize: 224, modelName: undefined } });
  });

  it('rejects pose and audio models by name', () => {
    const pose = parseMetadata({ ...valid, packageName: '@teachablemachine/pose' });
    expect(pose.ok).toBe(false);
    if (!pose.ok) expect(pose.error).toMatch(/pose model/);

    const audio = parseMetadata({ ...valid, packageName: '@tensorflow-models/speech-commands' });
    expect(audio.ok).toBe(false);
    if (!audio.ok) expect(audio.error).toMatch(/audio model/);
  });

  it('rejects unknown packages', () => {
    const r = parseMetadata({ ...valid, packageName: '@acme/other' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('@acme/other');
  });

  it('rejects missing, empty or malformed labels', () => {
    expect(parseMetadata({ imageSize: 224 }).ok).toBe(false);
    expect(parseMetadata({ labels: [], imageSize: 224 }).ok).toBe(false);
    expect(parseMetadata({ labels: ['a', 1], imageSize: 224 }).ok).toBe(false);
    expect(parseMetadata({ labels: ['a', ''], imageSize: 224 }).ok).toBe(false);
  });

  it('rejects a bad imageSize', () => {
    for (const imageSize of [undefined, 0, -1, 224.5, '224']) {
      expect(parseMetadata({ labels: ['a'], imageSize }).ok, String(imageSize)).toBe(false);
    }
  });

  it('rejects non-objects', () => {
    for (const json of [null, undefined, 'x', 3, []]) {
      expect(parseMetadata(json).ok).toBe(false);
    }
  });

  it('returns a copy of the labels array', () => {
    const labels = ['a', 'b'];
    const r = parseMetadata({ labels, imageSize: 1 });
    if (r.ok) {
      r.value.labels.push('c');
      expect(labels).toEqual(['a', 'b']);
    }
  });
});
