import { fail, ok, type ResolvedModelUrls, type Result } from './types';

export const TM_HOST = 'teachablemachine.withgoogle.com';
export const MODEL_URL_HINT = "Paste the share link from Teachable Machine's Export panel";

const FILE_SUFFIXES = ['model.json', 'metadata.json'];

/** Strips a trailing model.json / metadata.json and guarantees a trailing slash. */
function toFolderPath(pathname: string): string {
  let path = pathname;
  for (const suffix of FILE_SUFFIXES) {
    if (path.endsWith('/' + suffix)) {
      path = path.slice(0, -suffix.length);
      break;
    }
  }
  return path.endsWith('/') ? path : path + '/';
}

function fromBase(base: string): Result<ResolvedModelUrls> {
  return ok({
    modelUrl: base + 'model.json',
    metadataUrl: base + 'metadata.json',
    displayUrl: base,
  });
}

/**
 * Turns whatever the user pasted into the two file URLs the loader needs.
 *
 * Accepts Teachable Machine share links (with or without a trailing slash or
 * `model.json`), any http(s) folder URL hosting the exported files, and the
 * app's own `/models/<id>/` preset paths.
 */
export function resolveModelUrl(input: string): Result<ResolvedModelUrls> {
  const raw = input.trim();
  if (!raw) return fail('Enter a model URL');

  if (raw.startsWith('/models/')) {
    const base = toFolderPath(raw.split(/[?#]/)[0]);
    if (base === '/models/') return fail(MODEL_URL_HINT);
    return fromBase(base);
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fail(MODEL_URL_HINT);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return fail(MODEL_URL_HINT);

  const path = toFolderPath(url.pathname);

  if (url.hostname === TM_HOST) {
    if (!/^\/models\/[^/]+\/$/.test(path)) {
      return fail("That link doesn't point at a Teachable Machine model. " + MODEL_URL_HINT);
    }
  }

  return fromBase(url.origin + path);
}
