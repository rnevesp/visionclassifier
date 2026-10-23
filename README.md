# Teachable Machine Playground

Load any [Teachable Machine](https://teachablemachine.withgoogle.com/) image model by URL and try it on your own pictures or a live camera feed. Everything runs in the browser with TensorFlow.js; no image ever leaves the page.

- Paste a model share link (Export model, then Upload) or pick the bundled chest X-ray preset.
- Classify by upload, drag and drop, clipboard paste, or live webcam at about four frames per second.
- Every class is shown as a bar; low-confidence results are flagged.
- Clear error states for bad links, unreachable hosts, pose or audio models, oversize files, blocked cameras, and machines without WebGL.

The bundled preset classifies chest X-rays as Normal, Virus or Bacteria. It is an educational demo trained on a public dataset and is not a diagnostic tool.

## Run locally

Requires Node 22 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

No environment variables or API keys are needed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves `dist/` locally on port 3000 |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript, strict mode |

CI runs typecheck, tests and build on every push and pull request.

## Deploy

The build output is fully static. `render.yaml` is a blueprint for a free Render static site:

1. Push this repo to GitHub.
2. In Render, choose New > Blueprint and select the repo.

Static sites on Render do not spin down. Any other static host works with the build command `npm ci && npm run build` and `dist/` as the publish directory.

## How it works

The app fetches the model's `metadata.json` first and validates it (labels, input size, and that it is an image model) before downloading any weights. The model then loads through `@teachablemachine/image`, which handles the same preprocessing Teachable Machine used in training, and predictions run on the WebGL backend when available. Switching models disposes the previous one. TensorFlow.js is loaded as a separate chunk on first use, so the page shell is small.

## Add your own model

1. Train an image project at [teachablemachine.withgoogle.com](https://teachablemachine.withgoogle.com/).
2. Export model > Tensorflow.js > Upload (shareable link), and copy the link.
3. Paste it into the Model URL field.

Models hosted elsewhere work too, as long as `model.json`, `metadata.json` and the weights sit in one folder served with CORS headers.

## Layout

```
src/App.tsx                 page composition and input mode
src/components/             model picker, image input, webcam input, results, error and disclaimer cards
src/hooks/                  useClassifier (model lifecycle), usePredictor, useWebcam
src/lib/                    pure helpers: URL resolution, metadata validation, ranking, file checks, recents
src/services/classifier.ts  the only module that imports TensorFlow.js
public/models/chest-xray/   bundled preset model
docs/superpowers/           design spec and implementation plan
```
