# WebGPU Speech-to-Text

Browser-based speech transcription powered by [Whisper](https://huggingface.co/openai/whisper-base) and WebGPU. No server, no API keys — the model runs entirely on your GPU inside the browser tab.

## Features

- Real-time transcription via OpenAI Whisper (tiny / base / small)
- WebGPU inference with automatic WASM fallback
- Voice activity detection — stops recording when you stop speaking
- Continuous mode for hands-free dictation
- Models cached in the browser after first download

## Requirements

- **Chrome 113+** (WebGPU enabled by default)
- Firefox and Safari fall back to WASM automatically (slower)
- Node.js (for the dev server only — not used at runtime)

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in Chrome.

## Usage

1. Select a model and click **Load Model**
2. Click the microphone or press `Space` to start recording
3. Speech is transcribed automatically and appears at the top of the transcript

### Recording modes

| Mode | Shortcut | Behaviour |
|---|---|---|
| Auto-stop | `2` | Records until silence is detected, then transcribes |
| Continuous | `3` | Loops: records → detects silence → transcribes → repeats |
| Manual | `1` | Toggle recording on/off manually (keyboard only) |

**`Space`** — start / stop recording  
**`Esc`** — stop the continuous loop  
**`1` `2` `3`** — switch modes

### Models

| Model | Size | Notes |
|---|---|---|
| Whisper Tiny | ~39 MB | Fastest, less accurate |
| Whisper Base | ~74 MB | Recommended — reliable for English, Swedish, Russian |
| Whisper Small | ~244 MB | Higher memory usage, may be slow |

Models are downloaded once and cached in the browser's Cache Storage.

## Architecture

- **`src/worker.js`** — Whisper pipeline runs in a Web Worker to keep the UI responsive
- **`src/audio.js`** — Microphone capture, VAD via `AnalyserNode`, and resampling to 16 kHz mono via `OfflineAudioContext`
- **`src/pipeline/index.js`** — Message protocol between main thread and worker (extension point for future VAD, LLM, and TTS stages)
- **`vite.config.js`** — Sets `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers required for `SharedArrayBuffer` (used by the ONNX WASM backend)

## Tech

- [`@huggingface/transformers`](https://github.com/huggingface/transformers.js) — Whisper inference in the browser
- [Vite](https://vitejs.dev) — dev server and bundler
- Web Audio API — audio capture and resampling
- WebGPU — GPU inference
