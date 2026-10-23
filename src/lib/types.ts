/** A single class score as returned by the classifier. */
export interface Prediction {
  className: string;
  probability: number;
}

/** Fully resolved locations of a Teachable Machine model's files. */
export interface ResolvedModelUrls {
  modelUrl: string;
  metadataUrl: string;
  /** The normalised base URL, used for display and for the recent-models list. */
  displayUrl: string;
}

/** The parts of Teachable Machine's metadata.json the app relies on. */
export interface ModelMetadata {
  labels: string[];
  imageSize: number;
  modelName?: string;
}

/** A model bundled with the app. */
export interface Preset {
  id: string;
  name: string;
  description: string;
  /** Base URL of the model folder, ending in a slash. */
  url: string;
  labels: string[];
  /** Notice rendered above results while this preset is loaded. */
  disclaimer?: string;
}

/** Where a model came from. */
export type ModelSource = { kind: 'preset'; preset: Preset } | { kind: 'url'; url: string };

/** Minimal result type so lib functions never throw for expected failures. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = <T = never>(error: string): Result<T> => ({ ok: false, error });
