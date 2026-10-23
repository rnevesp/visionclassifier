import type { Preset } from './types';

/**
 * Models bundled with the app under public/models/. The URL is a root-relative
 * folder so it works in dev, preview and on the static host alike.
 */
export const PRESETS: readonly Preset[] = [
  {
    id: 'chest-xray',
    name: 'Chest X-ray triage',
    description:
      'Classifies a chest X-ray as Normal, Virus or Bacteria. Trained with Teachable Machine on a public pneumonia dataset.',
    url: '/models/chest-xray/',
    labels: ['Normal', 'Virus', 'Bacteria'],
    disclaimer:
      'Educational demo only. This model was trained on a small public dataset and has not been clinically validated. It is not a diagnostic tool and must not inform medical decisions.',
  },
];

export function findPreset(id: string): Preset | undefined {
  return PRESETS.find((p) => p.id === id);
}
