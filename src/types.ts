export type Mode = 'manual' | 'auto' | 'continuous';
export type Tab = 'record' | 'grammar';
export type ModelState = 'idle' | 'loading' | 'ready';
export type CorrectionStatus = 'none' | 'correcting' | 'done';

export interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  corrected?: string;
  correctionStatus: CorrectionStatus;
}

export interface GrammarCheck {
  id: string;
  text: string;
  timestamp: Date;
  corrected?: string;
  correctionStatus: Exclude<CorrectionStatus, 'none'>;
}

export interface AppState {
  modelState: ModelState;
  modelLabel: string;
  whisperProgress: Record<string, number>;

  grammarState: ModelState;
  grammarProgress: Record<string, number>;
  autoCorrect: boolean;

  mode: Mode;
  recordingState: 'idle' | 'recording' | 'transcribing';
  continuousActive: boolean;

  activeTab: Tab;
  entries: TranscriptEntry[];
  grammarChecks: GrammarCheck[];
}

export type AppAction =
  | { type: 'WHISPER_LOADING' }
  | { type: 'WHISPER_PROGRESS'; file: string; progress: number; status: string }
  | { type: 'WHISPER_READY'; label: string }
  | { type: 'WHISPER_UNLOADED' }
  | { type: 'GRAMMAR_LOADING' }
  | { type: 'GRAMMAR_PROGRESS'; file: string; progress: number; status: string }
  | { type: 'GRAMMAR_READY' }
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'RECORDING_START' }
  | { type: 'RECORDING_STOP' }
  | { type: 'TRANSCRIBING' }
  | { type: 'TRANSCRIBING_DONE' }
  | { type: 'ADD_ENTRY'; id: string; text: string }
  | { type: 'SET_CORRECTION'; id: string; corrected: string }
  | { type: 'SET_CORRECTION_STATUS'; id: string; status: CorrectionStatus }
  | { type: 'ADD_GRAMMAR_CHECK'; id: string; text: string }
  | { type: 'SET_GRAMMAR_CHECK_CORRECTION'; id: string; corrected: string }
  | { type: 'SET_AUTO_CORRECT'; enabled: boolean }
  | { type: 'SET_TAB'; tab: Tab }
  | { type: 'CONTINUOUS_ACTIVE'; active: boolean };

// Worker message shapes
export interface ProgressMessage {
  type: 'progress';
  stage?: 'grammar';
  file?: string;
  progress?: number;
  status: string;
  message?: string;
}
export interface ReadyMessage    { type: 'ready' }
export interface GrammarReadyMessage { type: 'grammar-ready' }
export interface ResultMessage   { type: 'result'; text: string }
export interface CorrectionMessage { type: 'correction'; id: string; original: string; corrected: string }
export interface ErrorMessage    { type: 'error'; message: string }

export type WorkerMessage =
  | ProgressMessage
  | ReadyMessage
  | GrammarReadyMessage
  | ResultMessage
  | CorrectionMessage
  | ErrorMessage;
