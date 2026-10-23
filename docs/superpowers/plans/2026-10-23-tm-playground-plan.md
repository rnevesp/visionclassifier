# Teachable Machine Playground: implementation plan

Spec: `docs/superpowers/specs/2026-10-23-tm-playground-design.md`. Each task ends in a commit. Verification per task is listed; the whole thing ends with typecheck, tests and a production build passing.

## 1. Repo hygiene and dependencies

- Replace `package.json`: new name, `engines.node >= 22`, scripts `dev`, `build`, `preview`, `typecheck`, `test`, `test:watch`. Drop `@google/genai`, `express`, `dotenv`, `tsx`, `@types/express`, `autoprefixer`, `clean` script. Move build tooling to devDependencies. Add `vitest`, `jsdom`, `@testing-library/react`, `@types/react`, `@types/react-dom`.
- Delete `metadata.json`, `.env.example`, `package-lock.json` (regenerated). Add `.gitattributes` (LF), `.nvmrc` (22).
- `tsconfig.json`: `strict: true`, `@/*` -> `./src/*`, include `src` and the Vite config.
- `vite.config.ts`: drop AI Studio HMR comment, alias to `src`, add Vitest `test` block (jsdom).
- Verify: `npm install` clean, `npm run typecheck` passes on the untouched old component.

## 2. Vendor the default model

- `public/models/chest-xray/{model.json,metadata.json,model.weights.bin}` downloaded from the Teachable Machine share URL.
- Verify: files present, `model.json` manifest points at `./model.weights.bin`, sizes match the remote.

## 3. Pure library modules with tests (`src/lib/`)

Write each module with its test file first, then make it pass:

- `types.ts`: `Prediction`, `ResolvedModelUrls`, `ModelMetadata`, `ModelSource`, `Preset`.
- `modelUrl.ts`: `resolveModelUrl(input)`. Cases: TM share URL with/without slash and `model.json`, custom host, local `/models/` path, garbage, empty, non-http scheme.
- `metadata.ts`: `parseMetadata(json)`. Cases: valid, missing labels, empty labels, non-string labels, bad imageSize, pose package, audio package, unknown package accepted.
- `predictions.ts`: `rankPredictions`, `formatPercent`, `isUncertain` (top < 0.5).
- `imageFile.ts`: `validateImageFile(file, maxBytes)`. Cases: ok, non-image, oversize, missing type with image extension.
- `recentModels.ts`: `loadRecentModels(storage)`, `saveRecentModel(storage, url)`. Cases: empty, dedupe, max 5, storage throws.
- `presets.ts`: the X-ray preset object.
- Verify: `npm test` green.

## 4. Classifier adapter (`src/services/classifier.ts`)

- `loadClassifier(urls, { signal, timeoutMs })`: fetch metadata with abort + timeout, `parseMetadata`, `tmImage.load`, wrap in `Classifier` with `predict`, `dispose`, `backend`.
- Map errors to user-facing messages: network, wrong type, timeout, abort.
- Verify: typecheck. Runtime check happens in the browser pass.

## 5. Hooks

- `useClassifier`: state machine per spec, sequence counter, abort controller, dispose on switch/unmount, records recent URL on ready. Test with mocked `services/classifier`.
- `useWebcam`: `start()`, `stop()`, `status: idle | starting | active | denied | unavailable`, stream attached to a video ref, stops tracks on unmount.
- Verify: `npm test` green.

## 6. Components and App

- `ErrorCard`, `Disclaimer`, `PredictionResults`, `ModelPicker`, `ImageInput`, `WebcamInput`, then `App.tsx`. Delete `ImageClassifier.tsx`.
- Accessibility: drop zone is a `<button>`-like element with keyboard support; labelled inputs; results `aria-live`.
- `index.html`: title "Teachable Machine Playground", description meta, theme colour.
- Verify: typecheck, `npm run build`, then `npm run preview` and a browser pass through the manual checklist in the spec.

## 7. CI and deploy files

- `.github/workflows/ci.yml`: Node 22, `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.
- `render.yaml` per spec.
- Verify: YAML parses; build command matches scripts.

## 8. Documentation

- Rewrite `README.md`. Write `CLAUDE.md`. Update spec status line if anything changed during implementation.
- Final: `npm run typecheck && npm test && npm run build` all pass; `git status` clean.
