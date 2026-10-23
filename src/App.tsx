import { Camera, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import Disclaimer from './components/Disclaimer';
import ImageInput from './components/ImageInput';
import ModelPicker from './components/ModelPicker';
import PredictionResults from './components/PredictionResults';
import WebcamInput from './components/WebcamInput';
import { useClassifier } from './hooks/useClassifier';
import { usePredictor } from './hooks/usePredictor';

type InputMode = 'upload' | 'webcam';

export default function App() {
  const { state, recent, load, retry, unload } = useClassifier();
  const classifier = state.status === 'ready' ? state.classifier : null;
  const { predictions, error, busy, run, reset } = usePredictor(classifier);

  const [mode, setMode] = useState<InputMode>('upload');
  const [hasInput, setHasInput] = useState(false);

  // Switching input mode discards the previous input and its results.
  useEffect(() => {
    setHasInput(false);
    reset();
  }, [mode, reset]);

  const onImage = useCallback(
    (image: HTMLImageElement) => {
      setHasInput(true);
      void run(image);
    },
    [run],
  );

  const onClear = useCallback(() => {
    setHasInput(false);
    reset();
  }, [reset]);

  const onFrame = useCallback((video: HTMLVideoElement) => void run(video), [run]);

  const disclaimer = state.status === 'ready' && state.source.kind === 'preset' ? state.source.preset.disclaimer : undefined;

  return (
    <div className="min-h-screen bg-surface text-gray-900">
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-light tracking-tight">Vision Classifier Playground</h1>
          <p className="mx-auto max-w-xl text-gray-500">
            Load any Teachable Machine image model and try it on your own pictures or a live camera feed. Everything
            runs in your browser.
          </p>
        </header>

        <div className="flex flex-col gap-8">
          <ModelPicker state={state} recent={recent} onLoad={load} onRetry={retry} onUnload={unload} />

          {classifier && (
            <section aria-labelledby="try-heading" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="try-heading" className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-400">
                  2. Try it
                </h2>
                <ModeTabs mode={mode} onChange={setMode} />
              </div>

              {disclaimer && <Disclaimer text={disclaimer} />}

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {mode === 'upload' ? (
                  <ImageInput onImage={onImage} onClear={onClear} />
                ) : (
                  <WebcamInput onFrame={onFrame} onActiveChange={setHasInput} />
                )}
                <PredictionResults
                  predictions={predictions}
                  busy={busy}
                  error={error}
                  hasInput={hasInput}
                  live={mode === 'webcam'}
                />
              </div>
            </section>
          )}
        </div>

        <footer className="mt-16 text-center text-xs text-gray-400">
          <p>
            Images and camera frames never leave your browser. Built with{' '}
            <a className="underline hover:text-gray-600" href="https://www.tensorflow.org/js" rel="noreferrer">
              TensorFlow.js
            </a>{' '}
            and{' '}
            <a className="underline hover:text-gray-600" href="https://teachablemachine.withgoogle.com/" rel="noreferrer">
              Teachable Machine
            </a>
            .
          </p>
        </footer>
      </main>
    </div>
  );
}

function ModeTabs({ mode, onChange }: { mode: InputMode; onChange: (m: InputMode) => void }) {
  const tabs: { id: InputMode; label: string; Icon: typeof Upload }[] = [
    { id: 'upload', label: 'Upload', Icon: Upload },
    { id: 'webcam', label: 'Webcam', Icon: Camera },
  ];
  return (
    <div role="tablist" aria-label="Input source" className="flex rounded-full bg-gray-200/70 p-1">
      {tabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={mode === id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
            mode === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden /> {label}
        </button>
      ))}
    </div>
  );
}
