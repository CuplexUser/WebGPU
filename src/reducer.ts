import type { AppState, AppAction, TranscriptEntry } from './types';

export const initialState: AppState = {
  modelState: 'idle',
  modelLabel: '',
  whisperProgress: {},

  grammarState: 'idle',
  grammarProgress: {},
  autoCorrect: false,

  mode: 'auto',
  recordingState: 'idle',
  continuousActive: false,

  activeTab: 'record',
  entries: [],
  grammarChecks: [],
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    case 'WHISPER_LOADING':
      return { ...state, modelState: 'loading', whisperProgress: {} };

    case 'WHISPER_PROGRESS': {
      const prev = state.whisperProgress[action.file] ?? 0;
      const next = action.status === 'done' ? 100 : (action.progress ?? prev);
      return { ...state, whisperProgress: { ...state.whisperProgress, [action.file]: next } };
    }

    case 'WHISPER_READY':
      return { ...state, modelState: 'ready', modelLabel: action.label };

    case 'WHISPER_UNLOADED':
      return {
        ...initialState,
        entries: state.entries,
        grammarChecks: state.grammarChecks,
        activeTab: state.activeTab,
        // Grammar model lives in the same worker — preserve its state across Whisper reloads
        grammarState: state.grammarState,
        grammarProgress: state.grammarProgress,
        autoCorrect: state.autoCorrect,
      };

    case 'GRAMMAR_LOADING':
      return { ...state, grammarState: 'loading', grammarProgress: {} };

    case 'GRAMMAR_PROGRESS': {
      const prev = state.grammarProgress[action.file] ?? 0;
      const next = action.status === 'done' ? 100 : (action.progress ?? prev);
      return { ...state, grammarProgress: { ...state.grammarProgress, [action.file]: next } };
    }

    case 'GRAMMAR_READY':
      return { ...state, grammarState: 'ready' };

    case 'SET_MODE':
      return { ...state, mode: action.mode, continuousActive: false };

    case 'RECORDING_START':
      return { ...state, recordingState: 'recording' };

    case 'RECORDING_STOP':
      return { ...state, recordingState: 'idle' };

    case 'TRANSCRIBING':
      return { ...state, recordingState: 'transcribing' };

    case 'TRANSCRIBING_DONE':
      return { ...state, recordingState: 'idle' };

    case 'ADD_ENTRY': {
      const entry: TranscriptEntry = {
        id: action.id,
        text: action.text,
        timestamp: new Date(),
        correctionStatus: 'none',
      };
      return { ...state, entries: [entry, ...state.entries] };
    }

    case 'SET_CORRECTION_STATUS':
      return {
        ...state,
        entries: state.entries.map(e =>
          e.id === action.id ? { ...e, correctionStatus: action.status } : e,
        ),
      };

    case 'SET_CORRECTION':
      return {
        ...state,
        entries: state.entries.map(e =>
          e.id === action.id ? { ...e, corrected: action.corrected, correctionStatus: 'done' } : e,
        ),
      };

    case 'ADD_GRAMMAR_CHECK':
      return {
        ...state,
        grammarChecks: [{
          id: action.id,
          text: action.text,
          timestamp: new Date(),
          correctionStatus: 'correcting',
        }, ...state.grammarChecks],
      };

    case 'SET_GRAMMAR_CHECK_CORRECTION':
      return {
        ...state,
        grammarChecks: state.grammarChecks.map(check =>
          check.id === action.id ? { ...check, corrected: action.corrected, correctionStatus: 'done' } : check,
        ),
      };

    case 'SET_AUTO_CORRECT':
      return { ...state, autoCorrect: action.enabled };

    case 'SET_TAB':
      return { ...state, activeTab: action.tab };

    case 'CONTINUOUS_ACTIVE':
      return { ...state, continuousActive: action.active };

    default:
      return state;
  }
}
