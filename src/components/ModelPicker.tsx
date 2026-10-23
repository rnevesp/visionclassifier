import { Check, Cpu, Link as LinkIcon, Loader2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { ClassifierState } from '@/hooks/useClassifier';
import { resolveModelUrl } from '@/lib/modelUrl';
import { PRESETS } from '@/lib/presets';
import type { ModelSource, Preset } from '@/lib/types';
import { loadErrorTitle } from '@/services/loadError';
import ErrorCard from './ErrorCard';

interface ModelPickerProps {
  state: ClassifierState;
  recent: string[];
  onLoad: (source: ModelSource) => void;
  onRetry: () => void;
  onUnload: () => void;
}

const sourceKey = (s: ModelSource) => (s.kind === 'preset' ? `preset:${s.preset.id}` : `url:${s.url}`);

export default function ModelPicker({ state, recent, onLoad, onRetry, onUnload }: ModelPickerProps) {
  const [url, setUrl] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();

  const currentKey = 'source' in state ? sourceKey(state.source) : undefined;
  const loading = state.status === 'loading';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const check = resolveModelUrl(url);
    if (!check.ok) {
      setFieldError(check.error);
      return;
    }
    setFieldError(undefined);
    onLoad({ kind: 'url', url: check.value.displayUrl });
  };

  return (
    <section
      aria-labelledby="model-heading"
      className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] md:p-8"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="model-heading" className="text-xs font-semibold uppercase tracking-[0.1em] text-gray-400">
            1. Choose a model
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Pick a bundled model or paste a share link from Teachable Machine (Export model, then Upload).
          </p>
        </div>
        {state.status === 'ready' && (
          <button
            type="button"
            onClick={onUnload}
            className="shrink-0 rounded-full px-3 py-1.5 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            Unload
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              selected={currentKey === `preset:${preset.id}`}
              status={state.status}
              disabled={loading}
              onSelect={() => onLoad({ kind: 'preset', preset })}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <form onSubmit={submit} noValidate className="flex flex-col gap-2">
            <label htmlFor="model-url" className="text-sm font-medium text-gray-700">
              Model URL
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  id="model-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="https://teachablemachine.withgoogle.com/models/…/"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (fieldError) setFieldError(undefined);
                  }}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? 'model-url-error' : undefined}
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Load
              </button>
            </div>
            {fieldError && (
              <p id="model-url-error" className="text-sm text-red-600">
                {fieldError}
              </p>
            )}
          </form>

          {recent.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Recent</p>
              <ul className="flex flex-col gap-1">
                {recent.map((r) => (
                  <li key={r}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setUrl(r);
                        setFieldError(undefined);
                        onLoad({ kind: 'url', url: r });
                      }}
                      className={`w-full truncate rounded-lg px-3 py-1.5 text-left font-mono text-xs transition hover:bg-gray-100 disabled:opacity-60 ${
                        currentKey === `url:${r}` ? 'bg-accent/10 text-accent' : 'text-gray-600'
                      }`}
                      title={r}
                    >
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <ModelStatus state={state} onRetry={onRetry} />
      </div>
    </section>
  );
}

function PresetCard({
  preset,
  selected,
  status,
  disabled,
  onSelect,
}: {
  preset: Preset;
  selected: boolean;
  status: ClassifierState['status'];
  disabled: boolean;
  onSelect: () => void;
}) {
  const ready = selected && status === 'ready';
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`group flex w-full flex-col gap-2 rounded-2xl border p-4 text-left transition disabled:cursor-wait ${
        selected ? 'border-accent bg-accent/5 ring-2 ring-accent/20' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-gray-900">{preset.name}</span>
        {ready ? (
          <span className="flex items-center gap-1 text-xs font-medium text-accent">
            <Check className="h-3.5 w-3.5" aria-hidden /> Loaded
          </span>
        ) : (
          <span className="text-xs text-gray-400 group-hover:text-gray-600">Bundled</span>
        )}
      </div>
      <p className="text-sm text-gray-500">{preset.description}</p>
      <LabelChips labels={preset.labels} />
    </button>
  );
}

function LabelChips({ labels }: { labels: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Classes">
      {labels.map((l) => (
        <li key={l} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
          {l}
        </li>
      ))}
    </ul>
  );
}

function ModelStatus({ state, onRetry }: { state: ClassifierState; onRetry: () => void }) {
  switch (state.status) {
    case 'idle':
      return <p className="text-sm text-gray-400">No model loaded.</p>;
    case 'loading':
      return (
        <div className="flex items-center gap-3 text-sm text-gray-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden />
          <span>
            Downloading model from <span className="font-mono text-xs">{state.urls.displayUrl}</span>…
          </span>
        </div>
      );
    case 'error':
      return (
        <ErrorCard
          title={loadErrorTitle(state.kind)}
          message={state.error}
          action={state.kind === 'invalid' ? undefined : { label: 'Retry', onClick: onRetry }}
          compact
        />
      );
    case 'ready': {
      const { classifier, urls } = state;
      const slow = classifier.backend !== 'webgl';
      return (
        <div className="flex flex-col gap-3 rounded-2xl bg-gray-50 p-4" role="status">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-gray-900">
              <Check className="h-4 w-4 text-green-600" aria-hidden />
              {classifier.modelName ?? 'Model'} ready
            </span>
            <span className="text-gray-500">
              {classifier.labels.length} classes · {classifier.imageSize} px input
            </span>
            <span className="flex items-center gap-1 text-gray-500" title="TensorFlow.js backend">
              <Cpu className="h-3.5 w-3.5" aria-hidden /> {classifier.backend}
            </span>
            <span className="truncate font-mono text-xs text-gray-400" title={urls.displayUrl}>
              {urls.displayUrl}
            </span>
          </div>
          <LabelChips labels={classifier.labels} />
          {slow && (
            <p className="flex items-center gap-2 text-xs text-amber-700">
              <X className="h-3.5 w-3.5" aria-hidden />
              WebGL is unavailable, so predictions run on the CPU and will be slower.
            </p>
          )}
        </div>
      );
    }
  }
}
