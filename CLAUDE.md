# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Vite dev server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

No test runner or linter is configured.

## Architecture

This is a React + TypeScript + Vite app. All AI inference runs client-side via `@huggingface/transformers` v3 (WebGPU or WASM backend).

### Threading model

The Whisper pipeline lives entirely in **`src/worker.ts`**, a Vite ESM Web Worker (`import Worker from '../worker?worker'`). The main thread never touches the model. Communication is strictly message-passing using the `MessageTypes` constants defined in **`src/pipeline/index.ts`** — that file is the single source of truth for the worker protocol and the intended extension point for future pipeline stages (VAD, LLM, TTS).

### Data flow

```
Mic → MediaRecorder (webm/opus chunks) → Blob
  → AudioContext({ sampleRate: 16000 }).decodeAudioData()  ← auto-resamples to 16 kHz
  → Float32Array (mono)
  → worker.postMessage(..., [audio.buffer])                ← zero-copy Transferable
  → Whisper pipeline → result.text
  → main thread → React state → DOM
```

Audio conversion is in **`src/services/AudioRecorder.ts`**. Constructing `AudioContext` at 16 kHz is what drives automatic resampling — do not change that sampleRate without also adjusting Whisper's expected input rate.

### Vite config constraints

`vite.config.ts` has two non-negotiable settings:
- `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` — required for `SharedArrayBuffer` (ONNX WASM threads)
- `optimizeDeps.exclude: ['@huggingface/transformers']` — Vite's pre-bundler breaks WebGPU/WASM init if it processes this package

### WASM proxy flag

In `src/worker.ts`: `env.backends.onnx.wasm.proxy = false`. The `proxy: true` setting seen in the original Xenova demo is for main-thread use only; it tells ONNX to forward calls to a separate worker. Since `worker.ts` already runs in a worker, enabling proxy causes an error.

### Progress tracking

The `@huggingface/transformers` progress_callback fires per-file events (`initiate` → `downloading` → `done`) for each model file downloaded in parallel. `src/App.tsx` tracks them in a `Map` and averages the values. When a model is already cached, only `done` fires — the UI handles this by treating a `done` without prior `downloading` as an instant 100%.

### Planned expansion (from Info.md)

The intended full pipeline is: Microphone → VAD (Silero, WASM) → Whisper (WebGPU) → LLM (WebGPU) → TTS (FastSpeech2/VITS/Bark, WebGPU or WASM). Add new pipeline stages by:
1. Adding message types to `src/pipeline/index.ts`
2. Handling them in `src/worker.ts` (or a separate worker per stage)
3. Wiring the UI through `src/App.tsx` and the service/component layer
