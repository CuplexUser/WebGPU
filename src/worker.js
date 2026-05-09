import { pipeline, env } from '@huggingface/transformers';
import { MessageTypes } from './pipeline/index.js';

// WASM config — proxy:false because we ARE the worker (no extra hop needed)
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = true;
env.backends.onnx.wasm.proxy = false;

let transcriber = null;

self.addEventListener('message', async ({ data }) => {
  const { type, ...payload } = data;

  if (type === MessageTypes.LOAD) {
    await loadModel(payload.model, payload.device ?? 'webgpu');
  } else if (type === MessageTypes.TRANSCRIBE) {
    await transcribe(payload);
  }
});

async function loadModel(modelId, preferredDevice) {
  const device = preferredDevice === 'webgpu' && 'gpu' in self.navigator
    ? 'webgpu'
    : 'wasm';

  if (device === 'wasm') {
    self.postMessage({
      type: MessageTypes.PROGRESS,
      status: 'warn',
      message: 'WebGPU unavailable — falling back to WASM (slower)',
    });
  }

  try {
    transcriber = await pipeline(
      'automatic-speech-recognition',
      modelId,
      {
        device,
        progress_callback: (progress) => {
          self.postMessage({ type: MessageTypes.PROGRESS, ...progress });
        },
      },
    );
    self.postMessage({ type: MessageTypes.READY });
  } catch (err) {
    self.postMessage({ type: MessageTypes.ERROR, message: err.message });
  }
}

async function transcribe({ audio, language }) {
  if (!transcriber) {
    self.postMessage({ type: MessageTypes.ERROR, message: 'Model not loaded' });
    return;
  }
  try {
    const result = await transcriber(audio, {
      language: language ?? null,
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    self.postMessage({ type: MessageTypes.RESULT, ...result });
  } catch (err) {
    self.postMessage({ type: MessageTypes.ERROR, message: err.message });
  }
}
