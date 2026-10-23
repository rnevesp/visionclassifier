/**
 * The only module that touches TensorFlow.js and @teachablemachine/image.
 * Everything else talks to the `Classifier` interface, so swapping the runtime
 * (for example to a direct tfjs 4.x loader) is a change to this file alone.
 */
import * as tmImage from '@teachablemachine/image';
import * as tf from '@tensorflow/tfjs';
import { parseMetadata } from '@/lib/metadata';
import type { Prediction, ResolvedModelUrls } from '@/lib/types';

export type ClassifierInput = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | ImageBitmap;

export interface Classifier {
  labels: string[];
  imageSize: number;
  modelName?: string;
  /** tfjs backend in use; anything other than 'webgl' will be slow. */
  backend: string;
  /** Returns one entry per label, unsorted. */
  predict(source: ClassifierInput): Promise<Prediction[]>;
  dispose(): void;
}

import { ClassifierLoadError } from './loadError';

export { ClassifierLoadError, describeLoadError, loadErrorTitle, type LoadErrorKind } from './loadError';

export interface LoadOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export const DEFAULT_LOAD_TIMEOUT_MS = 30_000;

/**
 * Resolves `promise`, or rejects as soon as `signal` aborts. If the promise
 * settles after the abort, `onLate` receives its value so resources can be
 * released.
 */
function raceWithAbort<T>(promise: Promise<T>, signal: AbortSignal, onLate: (value: T) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const fail = () => {
      promise.then(onLate, () => undefined);
      reject(new ClassifierLoadError('aborted', 'Loading was cancelled'));
    };
    if (signal.aborted) return fail();
    signal.addEventListener('abort', fail, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', fail);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', fail);
        reject(error);
      },
    );
  });
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof ClassifierLoadError && error.kind === 'aborted') ||
    (error instanceof DOMException && error.name === 'AbortError')
  );
}

/** Maps whatever tfjs threw while fetching or parsing model files. */
function fromModelLoadFailure(error: unknown, url: string): ClassifierLoadError {
  const message = error instanceof Error ? error.message : String(error);
  if (/status code|failed|fetch|network/i.test(message)) {
    return new ClassifierLoadError('network', `The model files at ${url} could not be downloaded. ${message}`);
  }
  return new ClassifierLoadError('invalid', `The model files could not be read. ${message}`);
}

/**
 * Loads a Teachable Machine image model. Validates metadata.json before any
 * weights are downloaded so wrong model types fail fast with a clear message.
 */
export async function loadClassifier(urls: ResolvedModelUrls, options: LoadOptions = {}): Promise<Classifier> {
  const { signal, timeoutMs = DEFAULT_LOAD_TIMEOUT_MS } = options;
  const controller = new AbortController();
  let timedOut = false;
  const forward = () => controller.abort();
  signal?.addEventListener('abort', forward, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const translate = (error: unknown): never => {
    if (timedOut) throw new ClassifierLoadError('timeout', `Loading timed out after ${Math.round(timeoutMs / 1000)} s`);
    if (isAbortError(error)) throw new ClassifierLoadError('aborted', 'Loading was cancelled');
    throw error;
  };

  try {
    let response: Response;
    try {
      response = await fetch(urls.metadataUrl, { signal: controller.signal });
    } catch (error) {
      translate(error);
      throw new ClassifierLoadError(
        'network',
        `No response from ${urls.displayUrl}. Check the address, your connection, or that the host allows cross-origin requests.`,
      );
    }
    if (!response.ok) {
      throw new ClassifierLoadError('network', `The server answered HTTP ${response.status} for ${urls.metadataUrl}.`);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ClassifierLoadError('invalid', 'metadata.json is not valid JSON');
    }
    const metadata = parseMetadata(json);
    if (!metadata.ok) throw new ClassifierLoadError('invalid', metadata.error);

    let model: tmImage.CustomMobileNet;
    try {
      model = await raceWithAbort(
        tmImage.load(urls.modelUrl, json as tmImage.Metadata),
        controller.signal,
        (late) => late.model.dispose(),
      );
    } catch (error) {
      translate(error);
      throw fromModelLoadFailure(error, urls.displayUrl);
    }

    const { labels, imageSize, modelName } = metadata.value;
    return {
      labels,
      imageSize,
      modelName,
      backend: tf.getBackend() ?? 'unknown',
      async predict(source) {
        const raw = await model.predict(source);
        return raw.map((p) => ({ className: p.className, probability: p.probability }));
      },
      dispose() {
        // CustomMobileNet.dispose() in 0.8.5 disposes `truncatedModel`, which is
        // only set for models trained in the browser; for loaded models it is
        // undefined and the call throws. Dispose the layers model directly.
        model.model.dispose();
      },
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forward);
  }
}
