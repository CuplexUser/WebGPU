/**
 * Pipeline message protocol — single source of truth for worker communication.
 *
 * Phase 1 (current): STT only
 *   load        → progress* → ready | error
 *   transcribe  → result | error
 *
 * Phase 2 (planned): VAD + STT
 *   stream-chunk (Float32Array, 512 samples) → vad-speech-start | vad-speech-end
 *
 * Phase 3 (planned): STT + LLM
 *   infer (text) → token (streaming) → infer-done | error
 *
 * Phase 4 (planned): Full pipeline + TTS
 *   synthesize (text) → audio-chunk (Float32Array) → synth-done | error
 *
 * Device routing:
 *   whisper  → webgpu (primary), wasm (fallback)
 *   llm      → webgpu only
 *   tts      → webgpu or wasm (FastSpeech2 fits in wasm)
 *   vad      → wasm (Silero VAD is tiny, no GPU needed)
 */

export const MessageTypes = {
  // Inbound
  LOAD: 'load',
  TRANSCRIBE: 'transcribe',
  STREAM_CHUNK: 'stream-chunk',
  INFER: 'infer',
  SYNTHESIZE: 'synthesize',
  ABORT: 'abort',

  // Inbound — grammar
  LOAD_GRAMMAR: 'load-grammar',
  CORRECT: 'correct',

  // Outbound
  PROGRESS: 'progress',
  READY: 'ready',
  GRAMMAR_READY: 'grammar-ready',
  CORRECTION: 'correction',
  VAD_SPEECH_START: 'vad-speech-start',
  VAD_SPEECH_END: 'vad-speech-end',
  RESULT: 'result',
  TOKEN: 'token',
  INFER_DONE: 'infer-done',
  AUDIO_CHUNK: 'audio-chunk',
  SYNTH_DONE: 'synth-done',
  ERROR: 'error',
};
