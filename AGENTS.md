# Repository Guidelines

## Project Structure & Module Organization

This is a React + TypeScript + Vite app for browser-side speech transcription. Application code lives in `src/`. UI components are in `src/components/`, reusable UI primitives in `src/components/ui/`, shared types in `src/types.ts`, and utility helpers in `src/lib/`. Audio capture is handled by `src/services/AudioRecorder.ts`; the inference bridge is `src/services/WorkerService.ts`; all Transformers.js model loading and inference runs in `src/worker.ts`. Worker message constants belong in `src/pipeline/index.ts`.

Static and generated assets are served from `public/` when present. Local model files are generated under `public/models/` and ONNX WASM assets under `public/wasm/`; both are ignored by git. Production builds output to `dist/`.

## Build, Test, and Development Commands

- `npm install` installs dependencies.
- `npm run dev` starts the Vite dev server, usually at `http://localhost:5173`.
- `npm run build` runs TypeScript project checks and creates a production build.
- `npm run preview` serves the built `dist/` output locally.
- `npm run cache-models` downloads supported Hugging Face model files into `public/models/` for faster cold starts.

There is currently no dedicated `npm test` script.

## Coding Style & Naming Conventions

Use TypeScript, React function components, and ES modules. Match the existing two-space indentation and single-quote import style. Name React components in `PascalCase` (`RecordTab.tsx`) and services/classes in descriptive `PascalCase` filenames. Keep protocol changes centralized in `src/pipeline/index.ts`; do not invent worker message strings inline. Prefer small, focused helpers over broad abstractions.

Styling uses Tailwind CSS. Reuse `src/components/ui/` primitives and `src/lib/utils.ts` for class merging before adding new styling patterns.

## Testing Guidelines

No automated test framework is configured yet. For now, verify changes with `npm run build` and manual browser checks in Chrome, especially model loading, microphone permission flow, recording modes, and grammar correction. If tests are added later, place them near the code they cover and use clear names such as `AudioRecorder.test.ts`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries such as `UI reworked` and `Grammar checking`. Keep commit messages concise and focused on the change. Pull requests should include a brief description, manual verification steps, linked issues when relevant, and screenshots or screen recordings for visible UI changes.

## Security & Configuration Tips

Inference runs locally in the browser; do not add API keys or server-side model calls unless the architecture changes deliberately. Use `.env.local` for local settings such as `VITE_TRANSFORMERS_OFFLINE=1`. Keep downloaded model blobs out of commits.
