import { MessageTypes } from '../pipeline/index';
import type { WorkerMessage } from '../types';
import PipelineWorker from '../worker?worker';

export type WorkerMessageHandler = (msg: WorkerMessage) => void;

export class WorkerService {
  private worker: Worker | null = null;

  start(onMessage: WorkerMessageHandler): void {
    const w = new PipelineWorker();
    this.worker = w;
    w.addEventListener('message', ({ data }: MessageEvent<WorkerMessage>) => onMessage(data));
    w.addEventListener('error', (e: ErrorEvent) =>
      onMessage({ type: 'error', message: e.message }),
    );
  }

  load(model: string): void {
    this.worker?.postMessage({ type: MessageTypes.LOAD, model, device: 'webgpu' });
  }

  transcribe(audio: Float32Array): void {
    this.worker?.postMessage(
      { type: MessageTypes.TRANSCRIBE, audio, language: null },
      [audio.buffer],
    );
  }

  loadGrammar(model: string): void {
    this.worker?.postMessage({ type: MessageTypes.LOAD_GRAMMAR, model });
  }

  correct(id: string, text: string): void {
    this.worker?.postMessage({ type: MessageTypes.CORRECT, id, text });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
  }

  get isActive(): boolean {
    return this.worker !== null;
  }
}
