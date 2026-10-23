# Teachable Machine Playground: design

Date: 2026-10-23. Status: approved by the project owner; implementation plan follows in `docs/superpowers/plans/`.

## Goal

Turn the AI Studio demo "Vision Classifier" into a portfolio-grade web app: a playground that loads any Teachable Machine **image** model by URL (or a bundled preset) and classifies images from upload, drag-drop, clipboard paste or live webcam, entirely in the browser. It deploys to Render as a static site.

## Decisions taken with the owner

| Question | Decision |
|---|---|
| Direction | Teachable Machine playground (user-supplied model URLs) rather than a single-purpose classifier or a Gemini-backed app. |
| Hosting | Render static site. No backend, no API keys. |
| Presets | Only the owner's chest X-ray model (labels Normal / Virus / Bacteria, 224 px, trained 2026-05-04). |
| Runtime | Keep `@teachablemachine/image` 0.8.5 with its pinned `@tensorflow/tfjs` 1.3.1, isolated in one adapter module. A tfjs 4.x migration is backlog, not this pass. |

## Non-goals

- Pose and audio Teachable Machine models (rejected with a clear message).
- Training, fine-tuning or exporting models.
- Saving or uploading user images anywhere. Nothing leaves the page.
- Server-side code of any kind.

## Architecture

Single-page React 19 + Vite + TypeScript app, Tailwind 4 via the Vite plugin. All inference runs client-side with TensorFlow.js. The build output in `dist/` is the whole deployable.

```
src/
  App.tsx                     composes the screens; holds only the selected input mode
  main.tsx                    React root
  index.css                   Tailwind + theme tokens
  lib/                        pure functions, unit-tested, no React, no tfjs
    modelUrl.ts               resolveModelUrl(input) -> { modelUrl, metadataUrl } | { error }
    metadata.ts               parseMetadata(json) -> { labels, imageSize } | { error }
    predictions.ts            rankPredictions(raw) -> sorted list; formatPercent(p)
    imageFile.ts              validateImageFile(file) -> ok | { error }
    recentModels.ts           load/save recent model URLs in localStorage (try/catch, max 5)
    presets.ts                PRESETS: the chest X-ray preset (name, description, local URL, disclaimer)
  services/
    classifier.ts             the only module that imports tfjs and @teachablemachine/image
  hooks/
    useClassifier.ts          model lifecycle state machine
    useWebcam.ts              getUserMedia lifecycle, permission states
  components/
    ModelPicker.tsx           preset cards, URL field, recent list, loaded-model summary with labels
    ImageInput.tsx            upload button, drop zone, clipboard paste; keyboard accessible
    WebcamInput.tsx           start/stop, live preview, throttled prediction loop
    PredictionResults.tsx     one bar per class, top result emphasised, aria-live region
    Disclaimer.tsx            preset-specific notice
    ErrorCard.tsx             message + recovery action
public/
  models/chest-xray/          vendored model.json, metadata.json, model.weights.bin (2.2 MB)
```

### `services/classifier.ts`

```ts
loadClassifier(urls: ResolvedModelUrls, opts: { signal: AbortSignal; timeoutMs: number }): Promise<Classifier>
interface Classifier {
  labels: string[];
  imageSize: number;
  backend: 'webgl' | 'cpu';
  predict(source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<Prediction[]>;
  dispose(): void;
}
```

Fetches and validates `metadata.json` through `lib/metadata.ts` before calling `tmImage.load`, so wrong model types fail fast with a specific message instead of a tensor-shape error. Rejects on abort or timeout (default 30 s). `dispose()` frees the underlying tfjs model. On first load it checks `tf.getBackend()`; if WebGL is unavailable it stays on CPU and reports `backend: 'cpu'` so the UI can warn that inference will be slow.

### `hooks/useClassifier.ts`

State: `{ status: 'idle' | 'loading' | 'ready' | 'error'; model?: Classifier; source?: ModelSource; error?: string }`.

Rules: a new `load(source)` aborts any in-flight load, disposes the current model, and ignores results from superseded loads (sequence counter). `unload()` disposes and returns to idle. On `ready`, the source URL is appended to recent models.

### Model URL rules (`lib/modelUrl.ts`)

Accepted inputs, id case-sensitive, surrounding whitespace trimmed:

- `https://teachablemachine.withgoogle.com/models/<id>` with or without trailing slash, with or without `model.json`.
- Any `http(s)` URL ending in `/` or `/model.json`: treated as a custom host; `metadata.json` is assumed alongside.
- Local preset paths starting with `/models/`.

Rejected: anything else, with error "Paste the share link from Teachable Machine's Export panel".

### Metadata rules (`lib/metadata.ts`)

Valid when `labels` is a non-empty string array and `imageSize` is a positive integer. If `packageName` is present and is not `@teachablemachine/image`, reject with "This is a {pose|audio} model; the playground supports image models only."

## User flow

1. **Pick a model.** Preset card or URL field. Recent URLs listed below the field. Loading state shows progress text; success shows model name, label chips and image size. Switching models clears results.
2. **Provide an image.** Tabs: Upload (file picker, drop zone, paste) and Webcam. Upload classifies once when the image element has loaded. Webcam classifies on a loop throttled to about 4 fps while running; Stop freezes the last frame and result.
3. **Read results.** Every label shown as a bar with a percentage; top result large. Low-confidence top result (under 50%) gets a muted "uncertain" tag. Results region is `aria-live="polite"`.
4. **Disclaimer.** Presets may carry a notice rendered above results. The X-ray preset says the model is an educational demo trained on a public dataset and is not a diagnostic tool. A global footer note says images never leave the browser.

## Error handling

| Situation | What the user sees | Recovery |
|---|---|---|
| Unparseable URL | Inline field error | Fix the URL |
| Metadata fetch fails (404, CORS, offline) | Error card "Could not reach the model" with the URL | Retry button |
| Wrong model type | Error card naming the type | Pick another model |
| Load exceeds 30 s | Error card "Loading timed out" | Retry |
| File not an image or over 10 MB | Inline message on the drop zone | Choose another file |
| Webcam denied / no device | Card explaining how to allow access, upload still works | Switch to Upload |
| WebGL unavailable | Banner "Running on CPU, predictions will be slower" | None needed |
| Prediction throws | Error card, image kept | Re-run |

Errors are logged to `console.error` as well; there is no telemetry.

## Removed from the current project

Unused dependencies: `@google/genai`, `express`, `dotenv`, `tsx`, `@types/express`, `autoprefixer`. `vite` and `@vitejs/plugin-react` move to devDependencies. Files: `metadata.json`, `.env.example` (no env needed), the AI Studio README banner. The `clean` script (Unix-only) goes; Vite empties `dist/` on build. `index.html` gets a real title and description.

## Testing and quality

- **Vitest** (jsdom environment) for every `src/lib/*` module and for `useClassifier` with a mocked `services/classifier` (abort of superseded loads, dispose on switch, error propagation).
- `tsc --noEmit` with `strict: true`.
- **GitHub Actions** workflow `ci.yml`: Node 22, `npm ci`, typecheck, test, build, on push and pull request.
- Manual browser pass before calling it done: preset load, custom URL load, pose-model rejection, upload, paste, webcam start/stop, model switch mid-session.

## Deployment

`render.yaml`:

```yaml
services:
  - type: web
    name: tm-playground
    runtime: static
    buildCommand: npm ci && npm run build
    staticPublishPath: dist
    routes:
      - type: rewrite
        source: /*
        destination: /index.html
```

`package.json` gets `"engines": { "node": ">=22" }` and the repo an `.nvmrc`. Free static sites on Render do not spin down.

## Documentation

`README.md` (what it is, run locally, scripts, deploy, how classification works, layout) and `CLAUDE.md` (commands, architecture, conventions, status and backlog) follow the structure used in the owner's SegmentAI project.

## Backlog after this pass

1. Migrate to tfjs 4.x by loading the layers model directly and reimplementing Teachable Machine's preprocessing (centre-crop to square, resize to `imageSize`, scale to [-1, 1]); verify probabilities match the Teachable Machine site on the same images before merging.
2. Optional second non-medical preset trained by the owner.
3. Lighthouse and bundle-size check (tfjs dominates the bundle; consider lazy-loading the classifier module).
