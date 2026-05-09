export const MessageTypes = {
  // Inbound — STT
  LOAD: 'load',
  TRANSCRIBE: 'transcribe',
  ABORT: 'abort',

  // Inbound — grammar
  LOAD_GRAMMAR: 'load-grammar',
  CORRECT: 'correct',

  // Inbound — future phases
  STREAM_CHUNK: 'stream-chunk',
  INFER: 'infer',
  SYNTHESIZE: 'synthesize',

  // Outbound
  PROGRESS: 'progress',
  READY: 'ready',
  GRAMMAR_READY: 'grammar-ready',
  RESULT: 'result',
  CORRECTION: 'correction',
  ERROR: 'error',

  // Outbound — future phases
  VAD_SPEECH_START: 'vad-speech-start',
  VAD_SPEECH_END: 'vad-speech-end',
  TOKEN: 'token',
  INFER_DONE: 'infer-done',
  AUDIO_CHUNK: 'audio-chunk',
  SYNTH_DONE: 'synth-done',
} as const;

export type MessageType = typeof MessageTypes[keyof typeof MessageTypes];
