import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { formatPercent, isUncertain } from '@/lib/predictions';
import type { Prediction } from '@/lib/types';
import ErrorCard from './ErrorCard';

interface PredictionResultsProps {
  predictions: Prediction[] | null;
  busy: boolean;
  error?: string;
  /** True once the user has supplied an image or started the camera. */
  hasInput: boolean;
  /** Live mode (webcam) keeps the previous result on screen between frames. */
  live?: boolean;
}

export default function PredictionResults({ predictions, busy, error, hasInput, live }: PredictionResultsProps) {
  const showSpinner = busy && (predictions === null || !live);

  return (
    <section
      aria-label="Classification results"
      className="flex min-h-[400px] flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:p-8"
    >
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.1em] text-gray-400">Results</h2>

      <div className="flex flex-1 flex-col justify-center" aria-live="polite" aria-busy={busy}>
        {error ? (
          <ErrorCard title="Classification failed" message={error} compact />
        ) : !hasInput ? (
          <div className="flex flex-col items-center text-gray-400">
            <ImageIcon size={48} strokeWidth={1} className="mb-4 opacity-50" aria-hidden />
            <p>Add an image or start the camera to see predictions.</p>
          </div>
        ) : showSpinner ? (
          <div className="flex flex-col items-center">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-accent" aria-hidden />
            <p className="text-gray-500">Analysing…</p>
          </div>
        ) : predictions && predictions.length > 0 ? (
          <ResultList predictions={predictions} />
        ) : (
          <p className="text-center text-gray-400">Waiting for the first frame…</p>
        )}
      </div>
    </section>
  );
}

function ResultList({ predictions }: { predictions: Prediction[] }) {
  const [top, ...rest] = predictions;
  const uncertain = isUncertain(predictions);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <span className="truncate text-2xl font-medium text-gray-900" title={top.className}>
            {top.className}
          </span>
          <span className="shrink-0 text-5xl font-light tabular-nums text-accent">{formatPercent(top.probability)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: formatPercent(top.probability, 2) }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        {uncertain && (
          <p className="mt-2 inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
            Low confidence: the model is not sure about this one
          </p>
        )}
      </div>

      {rest.length > 0 && (
        <ul className="space-y-3">
          {rest.map((p) => (
            <li key={p.className} className="flex items-center gap-4">
              <span className="w-1/3 truncate text-sm text-gray-600" title={p.className}>
                {p.className}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  className="h-full rounded-full bg-gray-400"
                  initial={false}
                  animate={{ width: formatPercent(p.probability, 2) }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <span className="w-14 text-right font-mono text-sm tabular-nums text-gray-500">
                {formatPercent(p.probability)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
