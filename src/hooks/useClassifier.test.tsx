import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModelSource, ResolvedModelUrls } from '@/lib/types';
import type { Classifier, LoadOptions } from '@/services/classifier';
import { ClassifierLoadError } from '@/services/loadError';
import { useClassifier } from './useClassifier';

// Never pull tfjs into the test process; the hook receives a fake loader.
vi.mock('@/services/classifier', () => ({ loadClassifier: vi.fn() }));

function fakeClassifier(labels = ['a', 'b']): Classifier {
  return {
    labels,
    imageSize: 224,
    backend: 'webgl',
    predict: vi.fn(async () => labels.map((l) => ({ className: l, probability: 1 / labels.length }))),
    dispose: vi.fn(),
  };
}

interface Deferred {
  urls: ResolvedModelUrls;
  options: LoadOptions;
  resolve: (c: Classifier) => void;
  reject: (e: unknown) => void;
}

/** A loader whose promises the test settles by hand. */
function deferredLoader() {
  const calls: Deferred[] = [];
  const loader = vi.fn((urls: ResolvedModelUrls, options: LoadOptions) => {
    return new Promise<Classifier>((resolve, reject) => {
      calls.push({ urls, options, resolve, reject });
    });
  });
  return { loader, calls };
}

const memoryStorage = () => {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
};

const urlSource = (url: string): ModelSource => ({ kind: 'url', url });
const presetSource: ModelSource = {
  kind: 'preset',
  preset: { id: 'p', name: 'P', description: '', url: '/models/p/', labels: ['a'] },
};

const flush = () => act(async () => {});

describe('useClassifier', () => {
  it('starts idle with recents from storage', () => {
    const storage = memoryStorage();
    storage.data['tm-playground.recentModels'] = JSON.stringify(['https://x/']);
    const { result } = renderHook(() => useClassifier({ loader: vi.fn(), storage }));
    expect(result.current.state.status).toBe('idle');
    expect(result.current.recent).toEqual(['https://x/']);
  });

  it('goes loading then ready and records URL sources as recent', async () => {
    const { loader, calls } = deferredLoader();
    const storage = memoryStorage();
    const { result } = renderHook(() => useClassifier({ loader, storage }));

    act(() => result.current.load(urlSource('https://teachablemachine.withgoogle.com/models/abc')));
    expect(result.current.state.status).toBe('loading');
    expect(calls[0].urls.modelUrl).toBe('https://teachablemachine.withgoogle.com/models/abc/model.json');

    const classifier = fakeClassifier();
    await act(async () => calls[0].resolve(classifier));
    expect(result.current.state.status).toBe('ready');
    if (result.current.state.status === 'ready') expect(result.current.state.classifier).toBe(classifier);
    expect(result.current.recent).toEqual(['https://teachablemachine.withgoogle.com/models/abc/']);
  });

  it('does not record presets as recent', async () => {
    const { loader, calls } = deferredLoader();
    const { result } = renderHook(() => useClassifier({ loader, storage: memoryStorage() }));
    act(() => result.current.load(presetSource));
    await act(async () => calls[0].resolve(fakeClassifier()));
    expect(result.current.recent).toEqual([]);
  });

  it('rejects an invalid URL without calling the loader', () => {
    const { loader } = deferredLoader();
    const { result } = renderHook(() => useClassifier({ loader, storage: memoryStorage() }));
    act(() => result.current.load(urlSource('nope')));
    expect(result.current.state.status).toBe('error');
    if (result.current.state.status === 'error') expect(result.current.state.kind).toBe('invalid');
    expect(loader).not.toHaveBeenCalled();
  });

  it('aborts and discards a superseded load, disposing its late result', async () => {
    const { loader, calls } = deferredLoader();
    const { result } = renderHook(() => useClassifier({ loader, storage: memoryStorage() }));

    act(() => result.current.load(urlSource('https://a.example/m/')));
    act(() => result.current.load(urlSource('https://b.example/m/')));
    expect(calls[0].options.signal?.aborted).toBe(true);
    expect(calls[1].options.signal?.aborted).toBe(false);

    const late = fakeClassifier(['late']);
    const fresh = fakeClassifier(['fresh']);
    await act(async () => calls[1].resolve(fresh));
    await act(async () => calls[0].resolve(late));

    expect(late.dispose).toHaveBeenCalledTimes(1);
    expect(fresh.dispose).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe('ready');
    if (result.current.state.status === 'ready') expect(result.current.state.classifier).toBe(fresh);
  });

  it('ignores a rejection from a superseded load', async () => {
    const { loader, calls } = deferredLoader();
    const { result } = renderHook(() => useClassifier({ loader, storage: memoryStorage() }));
    act(() => result.current.load(urlSource('https://a.example/m/')));
    act(() => result.current.load(urlSource('https://b.example/m/')));
    await act(async () => calls[0].reject(new ClassifierLoadError('aborted', 'cancelled')));
    expect(result.current.state.status).toBe('loading');
  });

  it('disposes the previous model when switching', async () => {
    const { loader, calls } = deferredLoader();
    const { result } = renderHook(() => useClassifier({ loader, storage: memoryStorage() }));
    act(() => result.current.load(urlSource('https://a.example/m/')));
    const first = fakeClassifier();
    await act(async () => calls[0].resolve(first));

    act(() => result.current.load(urlSource('https://b.example/m/')));
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe('loading');
  });

  it('surfaces loader errors with their kind and supports retry', async () => {
    const { loader, calls } = deferredLoader();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useClassifier({ loader, storage: memoryStorage() }));

    act(() => result.current.load(urlSource('https://a.example/m/')));
    await act(async () => calls[0].reject(new ClassifierLoadError('network', 'Could not reach')));
    expect(result.current.state).toMatchObject({ status: 'error', kind: 'network', error: 'Could not reach' });

    act(() => result.current.retry());
    expect(result.current.state.status).toBe('loading');
    expect(calls).toHaveLength(2);
    await flush();
    errorSpy.mockRestore();
  });

  it('unload disposes and returns to idle; unmount disposes too', async () => {
    const { loader, calls } = deferredLoader();
    const { result, unmount } = renderHook(() => useClassifier({ loader, storage: memoryStorage() }));
    act(() => result.current.load(urlSource('https://a.example/m/')));
    const c = fakeClassifier();
    await act(async () => calls[0].resolve(c));

    act(() => result.current.unload());
    expect(c.dispose).toHaveBeenCalledTimes(1);
    expect(result.current.state.status).toBe('idle');

    act(() => result.current.load(urlSource('https://a.example/m/')));
    const d = fakeClassifier();
    await act(async () => calls[1].resolve(d));
    unmount();
    expect(d.dispose).toHaveBeenCalledTimes(1);
  });
});
