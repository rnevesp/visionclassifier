import { fail, ok, type ModelMetadata, type Result } from './types';

export const IMAGE_PACKAGE = '@teachablemachine/image';

const KNOWN_OTHER_PACKAGES: Record<string, string> = {
  '@teachablemachine/pose': 'pose',
  '@tensorflow-models/speech-commands': 'audio',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates the JSON of a Teachable Machine metadata.json and extracts what
 * the app needs. Rejects pose and audio models with a type-specific message
 * so the user learns why before any weights are downloaded.
 */
export function parseMetadata(json: unknown): Result<ModelMetadata> {
  if (!isRecord(json)) return fail('metadata.json is not a JSON object');

  const pkg = json.packageName;
  if (typeof pkg === 'string' && pkg !== IMAGE_PACKAGE) {
    const type = KNOWN_OTHER_PACKAGES[pkg];
    return fail(
      type
        ? `This is a ${type} model; the playground supports image models only.`
        : `Unsupported model type (${pkg}); the playground supports Teachable Machine image models only.`,
    );
  }

  const labels = json.labels;
  if (!Array.isArray(labels) || labels.length === 0) {
    return fail('metadata.json has no class labels');
  }
  if (!labels.every((l): l is string => typeof l === 'string' && l.length > 0)) {
    return fail('metadata.json labels must be non-empty strings');
  }

  const imageSize = json.imageSize;
  if (typeof imageSize !== 'number' || !Number.isInteger(imageSize) || imageSize <= 0) {
    return fail('metadata.json has no valid imageSize');
  }

  const modelName = typeof json.modelName === 'string' && json.modelName ? json.modelName : undefined;

  return ok({ labels: [...labels], imageSize, modelName });
}
