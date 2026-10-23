import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveModelUrl } from '@/lib/modelUrl';
import { loadRecentModels, saveRecentModel, type StorageLike } from '@/lib/recentModels';
import type { ModelSource, ResolvedModelUrls } from '@/lib/types';
import type { Classifier, LoadOptions } from '@/services/classifier';
import { describeLoadError, type LoadErrorKind } from '@/services/loadError';

/**
 * The real loader pulls in TensorFlow.js (about 1.2 MB minified), so it is
 * imported on first use and ships as its own chunk instead of blocking paint.
 */
async function defaultLoader(urls: ResolvedModelUrls, options: LoadOptions): Promise<Classifier> {
  const { loadClassifier } = await import('@/services/classifier');
  return loadClassifier(urls, options);
}

export type ClassifierState =
  | { status: 'idle' }
  | { status: 'loading'; source: ModelSource; urls: ResolvedModelUrls }
  | { status: 'ready'; source: ModelSource; urls: ResolvedModelUrls; classifier: Classifier }
  | { status: 'error'; source: ModelSource; urls?: ResolvedModelUrls; error: string; kind: LoadErrorKind | 'unknown' };

export interface UseClassifierOptions {
  /** Injected in tests; defaults to the real tfjs-backed loader. */
  loader?: (urls: ResolvedModelUrls, options: LoadOptions) => Promise<Classifier>;
  /** Where recent URLs live; defaults to localStorage when available. */
  storage?: StorageLike;
}

export interface UseClassifier {
  state: ClassifierState;
  recent: string[];
  load: (source: ModelSource) => void;
  retry: () => void;
  unload: () => void;
}

export function sourceUrl(source: ModelSource): string {
  return source.kind === 'preset' ? source.preset.url : source.url;
}

/** A model that fails to free its memory must never block loading the next one. */
function safeDispose(classifier: Classifier | null | undefined): void {
  if (!classifier) return;
  try {
    classifier.dispose();
  } catch (error) {
    console.error('Failed to dispose model', error);
  }
}

function defaultStorage(): StorageLike | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Owns the lifetime of the loaded model. Exactly one classifier is alive at a
 * time: starting a new load aborts the previous one and disposes the previous
 * model, and results from superseded loads are discarded.
 */
export function useClassifier(options: UseClassifierOptions = {}): UseClassifier {
  const loader = options.loader ?? defaultLoader;
  const storageRef = useRef<StorageLike | undefined>(options.storage ?? defaultStorage());

  const [state, setState] = useState<ClassifierState>({ status: 'idle' });
  const [recent, setRecent] = useState<string[]>(() => loadRecentModels(storageRef.current));

  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const liveRef = useRef<Classifier | null>(null);
  const lastSourceRef = useRef<ModelSource | null>(null);

  const teardown = useCallback(() => {
    seqRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    safeDispose(liveRef.current);
    liveRef.current = null;
  }, []);

  const load = useCallback(
    (source: ModelSource) => {
      lastSourceRef.current = source;
      teardown();
      const seq = seqRef.current;

      const resolved = resolveModelUrl(sourceUrl(source));
      if (!resolved.ok) {
        setState({ status: 'error', source, error: resolved.error, kind: 'invalid' });
        return;
      }
      const urls = resolved.value;

      const controller = new AbortController();
      abortRef.current = controller;
      setState({ status: 'loading', source, urls });

      loader(urls, { signal: controller.signal }).then(
        (classifier) => {
          if (seq !== seqRef.current) {
            safeDispose(classifier);
            return;
          }
          liveRef.current = classifier;
          abortRef.current = null;
          if (source.kind === 'url') setRecent(saveRecentModel(storageRef.current, urls.displayUrl));
          setState({ status: 'ready', source, urls, classifier });
        },
        (error: unknown) => {
          if (seq !== seqRef.current) return;
          abortRef.current = null;
          const { kind, message } = describeLoadError(error);
          console.error('Model load failed', error);
          setState({ status: 'error', source, urls, error: message, kind });
        },
      );
    },
    [loader, teardown],
  );

  const retry = useCallback(() => {
    if (lastSourceRef.current) load(lastSourceRef.current);
  }, [load]);

  const unload = useCallback(() => {
    teardown();
    setState({ status: 'idle' });
  }, [teardown]);

  useEffect(() => teardown, [teardown]);

  return { state, recent, load, retry, unload };
}
