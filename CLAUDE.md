# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Teachable Machine Playground": a static web app that loads any Teachable Machine image model by URL (or a bundled chest X-ray preset) and classifies uploaded images, pasted images or live webcam frames in the browser with TensorFlow.js. There is no backend and no API key. The project started as a Google AI Studio export called "Vision Classifier"; the folder keeps that name.

## Commands

```bash
npm install
npm run dev          # Vite dev server on http://localhost:3000
npm run build        # vite build -> dist/
npm run preview      # serves dist/ on port 3000 (what Render serves)
npm run typecheck    # tsc --noEmit, strict
npm test             # vitest run
npm run test:watch
npx vitest run src/lib/modelUrl.test.ts   # single file
```

Node 22+ (`.nvmrc`, `engines`). No linter is configured; `typecheck` with `noUnusedLocals` is the only static check.

## Architecture

**Everything is client-side.** `dist/` is the whole deployable; `render.yaml` publishes it as a Render static site with an SPA rewrite.

**Layers, from pure to impure:**

- `src/lib/` pure functions over plain data, no React, no tfjs, all unit-tested. `modelUrl.ts` turns any pasted link into `{ modelUrl, metadataUrl, displayUrl }`. `metadata.ts` validates `metadata.json` and rejects pose/audio models by `packageName`. `predictions.ts` ranks and formats. `imageFile.ts` checks type and size (10 MB). `recentModels.ts` is localStorage with try/catch. `presets.ts` lists bundled models. `types.ts` has the shared types and a tiny `Result<T>`.
- `src/services/classifier.ts` is the **only** module importing `@tensorflow/tfjs` and `@teachablemachine/image`. `loadClassifier(urls, { signal, timeoutMs })` fetches and validates metadata first, then calls `tmImage.load` with the metadata object (no second fetch), races it against abort/timeout, and returns a `Classifier` (`labels`, `imageSize`, `backend`, `predict`, `dispose`). Errors are `ClassifierLoadError` with a `kind` (`network | invalid | timeout | aborted`) from `services/loadError.ts`, which is tfjs-free so UI and tests can import it cheaply.
- `src/hooks/useClassifier.ts` owns the model lifetime: state machine `idle -> loading -> ready | error`, one live model at a time, abort + dispose on switch, sequence counter to discard superseded loads, recents recorded for URL sources only. It lazy-imports `services/classifier`, which is why tfjs is a separate ~940 kB chunk and the page shell is ~380 kB. `usePredictor.ts` runs predictions and drops calls while busy (the webcam loop depends on that). `useWebcam.ts` wraps `getUserMedia` with `denied | unavailable | error` statuses.
- `src/components/` are presentational: `ModelPicker` (presets, URL form with inline validation, recents, status/error), `ImageInput` (object URLs, drop, document-level paste), `WebcamInput` (interval sampling at ~4 fps, Stop draws the last frame to a canvas), `PredictionResults` (aria-live, uncertain tag under 50%), `ErrorCard`, `Disclaimer`.
- `src/App.tsx` composes them and holds only the input mode and a `hasInput` flag.

**Default model** lives in `public/models/chest-xray/` (model.json, metadata.json, model.weights.bin, 2.2 MB) so the app works even if the Teachable Machine hosted copy disappears. Labels: Normal, Virus, Bacteria; input 224 px. The preset carries a medical disclaimer rendered above results.

Design and plan: `docs/superpowers/specs/2026-10-23-tm-playground-design.md`, `docs/superpowers/plans/2026-10-23-tm-playground-plan.md`.

## Conventions and quirks

- `@teachablemachine/image` 0.8.5 hard-pins `@tensorflow/tfjs` 1.3.1 (2019). That pin is deliberate and isolated in `services/classifier.ts`; do not bump tfjs without reimplementing the loader (see backlog).
- `CustomMobileNet.dispose()` in 0.8.5 throws for URL-loaded models (it disposes an undefined `truncatedModel`). The adapter disposes `model.model` directly and the hook wraps dispose in try/catch. Keep both.
- `@/*` maps to `src/*` in both `tsconfig.json` and `vite.config.ts`; hooks and services use it, components use relative imports for siblings.
- Tailwind 4 via `@tailwindcss/vite`; theme tokens (`--color-surface`, `--color-accent`) are in `src/index.css`. Light theme only.
- Tests run in jsdom. `useClassifier.test.tsx` mocks `@/services/classifier` entirely so tfjs never loads in Node.
- `.gitattributes` forces LF; the Windows checkout warns about CRLF, which is expected.

## Status and backlog

Done (2026-10-23): rebuilt from the AI Studio demo per the spec. Verified with `typecheck`, 45 unit tests, a production build, and a headless Edge pass (Playwright, fake camera device) covering: preset load on WebGL, upload prediction summing to 100%, clear, invalid URL, 404 host, pose-model rejection, custom-host load with recents, webcam live + stop freeze, unload, and no horizontal overflow at 390 px. Not yet verified: a real camera on a phone, Safari.

Backlog, in priority order:

1. Push to GitHub and deploy via the Render blueprint; check the live URL on a phone (camera permission flow, `facingMode: environment`).
2. Migrate off `@teachablemachine/image` to tfjs 4.x: load the layers model directly and reimplement its preprocessing (centre-crop to square, resize to `imageSize`, scale to [-1, 1]); compare probabilities against the Teachable Machine site on the same images before merging.
3. A second, non-medical preset trained by the owner.
4. Optional: Playwright smoke test checked into the repo (the current one lives outside it) and run in CI with the fake-device flags.
