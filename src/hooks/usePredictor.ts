import { useCallback, useEffect, useRef, useState } from 'react';
import { rankPredictions } from '@/lib/predictions';
import type { Prediction } from '@/lib/types';
import type { Classifier, ClassifierInput } from '@/services/classifier';

export interface UsePredictor {
  /** Ranked results, or null before the first run with the current model. */
  predictions: Prediction[] | null;
  error?: string;
  busy: boolean;
  run: (source: ClassifierInput) => Promise<void>;
  reset: () => void;
}

/**
 * Runs predictions against the current classifier. Calls while a prediction
 * is in flight are dropped (the webcam loop relies on this), and results are
 * cleared whenever the classifier changes.
 */
export function usePredictor(classifier: Classifier | null): UsePredictor {
  const [predictions, setPredictions] = useState<Prediction[] | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const seqRef = useRef(0);

  const reset = useCallback(() => {
    seqRef.current += 1;
    busyRef.current = false;
    setBusy(false);
    setPredictions(null);
    setError(undefined);
  }, []);

  useEffect(() => {
    reset();
  }, [classifier, reset]);

  const run = useCallback(
    async (source: ClassifierInput) => {
      if (!classifier || busyRef.current) return;
      const seq = seqRef.current;
      busyRef.current = true;
      setBusy(true);
      try {
        const raw = await classifier.predict(source);
        if (seq !== seqRef.current) return;
        setPredictions(rankPredictions(raw));
        setError(undefined);
      } catch (err) {
        if (seq !== seqRef.current) return;
        console.error('Prediction failed', err);
        setError(err instanceof Error ? err.message : 'Classification failed');
      } finally {
        if (seq === seqRef.current) {
          busyRef.current = false;
          setBusy(false);
        }
      }
    },
    [classifier],
  );

  return { predictions, error, busy, run, reset };
}
