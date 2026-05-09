import { pipeline, env } from '@huggingface/transformers';
import { MessageTypes } from './pipeline/index';

if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.simd = true;
  env.backends.onnx.wasm.proxy = false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let corrector: any = null;

self.addEventListener('message', async ({ data }: MessageEvent) => {
  const { type, ...payload } = data as { type: string; [k: string]: unknown };

  if (type === MessageTypes.LOAD)           await loadModel(payload.model as string, (payload.device as string) ?? 'webgpu');
  else if (type === MessageTypes.TRANSCRIBE) await transcribe(payload as { audio: Float32Array; language: string | null });
  else if (type === MessageTypes.LOAD_GRAMMAR) await loadGrammarModel(payload.model as string);
  else if (type === MessageTypes.CORRECT)    await correctGrammar(payload as { id: string; text: string });
});

async function loadModel(modelId: string, preferredDevice: string): Promise<void> {
  const device = preferredDevice === 'webgpu' && 'gpu' in self.navigator
    ? 'webgpu'
    : 'wasm';

  if (device === 'wasm') {
    self.postMessage({ type: MessageTypes.PROGRESS, status: 'warn', message: 'WebGPU unavailable — falling back to WASM (slower)' });
  }

  try {
    transcriber = await pipeline(
      'automatic-speech-recognition',
      modelId,
      { device, progress_callback: (p: object) => self.postMessage({ type: MessageTypes.PROGRESS, ...p }) },
    );
    self.postMessage({ type: MessageTypes.READY });
  } catch (err) {
    self.postMessage({ type: MessageTypes.ERROR, message: (err as Error).message });
  }
}

async function transcribe({ audio, language }: { audio: Float32Array; language: string | null }): Promise<void> {
  if (!transcriber) { self.postMessage({ type: MessageTypes.ERROR, message: 'Model not loaded' }); return; }
  try {
    const result = await transcriber(audio, {
      language: language ?? null,
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    self.postMessage({ type: MessageTypes.RESULT, ...result });
  } catch (err) {
    self.postMessage({ type: MessageTypes.ERROR, message: (err as Error).message });
  }
}

async function loadGrammarModel(modelId: string): Promise<void> {
  try {
    corrector = await pipeline(
      'text2text-generation',
      modelId,
      { device: 'wasm', progress_callback: (p: object) => self.postMessage({ type: MessageTypes.PROGRESS, stage: 'grammar', ...p }) },
    );
    self.postMessage({ type: MessageTypes.GRAMMAR_READY });
  } catch (err) {
    self.postMessage({ type: MessageTypes.ERROR, message: `Grammar model: ${(err as Error).message}` });
  }
}

async function correctGrammar({ id, text }: { id: string; text: string }): Promise<void> {
  if (!corrector) return;
  try {
    const result = await corrector(text, { max_new_tokens: 256 }) as Array<{ generated_text: string }>;
    self.postMessage({ type: MessageTypes.CORRECTION, id, original: text, corrected: result[0].generated_text });
  } catch (err) {
    self.postMessage({ type: MessageTypes.ERROR, message: (err as Error).message });
  }
}
