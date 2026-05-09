import { useReducer, useRef, useCallback, useEffect } from 'react';
import { appReducer, initialState } from './reducer';
import { WorkerService } from './services/WorkerService';
import { AudioRecorder } from './services/AudioRecorder';
import type { WorkerMessage, Mode } from './types';
import Header from './components/Header';
import RecordTab from './components/RecordTab';
import GrammarTab from './components/GrammarTab';
import { cn } from './lib/utils';

const GRAMMAR_MODEL = 'Xenova/grammar-synthesis-small';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const workerRef = useRef<WorkerService>(new WorkerService());
  const recorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const continuousRef = useRef(false);
  const pendingWhisperLabel = useRef('');

  // Keep continuousRef in sync with state (avoids stale closure in callbacks)
  useEffect(() => { continuousRef.current = state.continuousActive; }, [state.continuousActive]);

  // ── Worker message handler ──────────────────────────────────────────────────

  const handleWorkerMessage = useCallback((msg: WorkerMessage) => {
    if (msg.type === 'progress') {
      if (msg.stage === 'grammar') {
        if (msg.file) dispatch({ type: 'GRAMMAR_PROGRESS', file: msg.file, progress: msg.progress ?? 0, status: msg.status });
      } else {
        if (msg.file) dispatch({ type: 'WHISPER_PROGRESS', file: msg.file, progress: msg.progress ?? 0, status: msg.status });
      }
    } else if (msg.type === 'ready') {
      dispatch({ type: 'WHISPER_READY', label: pendingWhisperLabel.current });
    } else if (msg.type === 'grammar-ready') {
      dispatch({ type: 'GRAMMAR_READY' });
    } else if (msg.type === 'result') {
      dispatch({ type: 'TRANSCRIBING_DONE' });
      const id = String(Date.now());
      dispatch({ type: 'ADD_ENTRY', id, text: msg.text });
      pendingAutoCorrect.current.push({ id, text: msg.text });
      if (continuousRef.current) beginRecording();
    } else if (msg.type === 'correction') {
      if (msg.id.startsWith('free-')) {
        dispatch({ type: 'SET_GRAMMAR_CHECK_CORRECTION', id: msg.id, corrected: msg.corrected });
      } else {
        dispatch({ type: 'SET_CORRECTION', id: msg.id, corrected: msg.corrected });
      }
    } else if (msg.type === 'error') {
      dispatch({ type: 'TRANSCRIBING_DONE' });
      dispatch({ type: 'CONTINUOUS_ACTIVE', active: false });
      console.error('Worker error:', msg.message);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Queue for auto-correct entries that arrive before grammar model is ready
  const pendingAutoCorrect = useRef<Array<{ id: string; text: string }>>([]);

  // Drain pending corrections when grammar becomes ready
  useEffect(() => {
    if (state.grammarState === 'ready' && state.autoCorrect) {
      pendingAutoCorrect.current.forEach(({ id, text }) => {
        dispatch({ type: 'SET_CORRECTION_STATUS', id, status: 'correcting' });
        workerRef.current.correct(id, text);
      });
      pendingAutoCorrect.current = [];
    }
  }, [state.grammarState, state.autoCorrect]);

  // ── Model load/unload ───────────────────────────────────────────────────────

  // Starts the worker if not already running (grammar and Whisper share one worker)
  const ensureWorker = useCallback(() => {
    if (!workerRef.current.isActive) {
      workerRef.current.start(handleWorkerMessage);
    }
  }, [handleWorkerMessage]);

  const loadWhisper = useCallback((modelId: string, modelLabel: string) => {
    dispatch({ type: 'WHISPER_LOADING' });
    pendingWhisperLabel.current = modelLabel;
    ensureWorker();
    workerRef.current.load(modelId);
  }, [ensureWorker]);

  const unloadWhisper = useCallback((grammarLoaded: boolean) => {
    dispatch({ type: 'WHISPER_UNLOADED' });
    dispatch({ type: 'CONTINUOUS_ACTIVE', active: false });
    pendingAutoCorrect.current = [];
    // Keep worker alive if grammar model is still loaded in it
    if (!grammarLoaded) workerRef.current.terminate();
  }, []);

  // ── Grammar ─────────────────────────────────────────────────────────────────

  const loadGrammar = useCallback(() => {
    if (state.grammarState !== 'idle') return;
    dispatch({ type: 'GRAMMAR_LOADING' });
    ensureWorker();
    workerRef.current.loadGrammar(GRAMMAR_MODEL);
  }, [state.grammarState, ensureWorker]);

  const triggerCorrection = useCallback((id: string, text: string) => {
    dispatch({ type: 'SET_CORRECTION_STATUS', id, status: 'correcting' });
    workerRef.current.correct(id, text);
  }, []);

  const handleAutoCorrectChange = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_AUTO_CORRECT', enabled });
    if (enabled && state.grammarState === 'idle') loadGrammar();
  }, [state.grammarState, loadGrammar]);

  const correctAll = useCallback(() => {
    state.entries
      .filter(e => e.correctionStatus === 'none')
      .forEach(e => triggerCorrection(e.id, e.text));
  }, [state.entries, triggerCorrection]);

  const checkFreeText = useCallback((text: string) => {
    const id = `free-${Date.now()}`;
    dispatch({ type: 'ADD_GRAMMAR_CHECK', id, text });
    workerRef.current.correct(id, text);
  }, []);

  // ── Recording ───────────────────────────────────────────────────────────────

  const beginRecording = useCallback(async () => {
    const currentMode = state.mode;
    const useVAD = currentMode === 'auto' || currentMode === 'continuous';
    try {
      await recorderRef.current.start({
        onSilence: useVAD ? endRecording : undefined,
      });
      dispatch({ type: 'RECORDING_START' });
    } catch {
      dispatch({ type: 'CONTINUOUS_ACTIVE', active: false });
    }
  }, [state.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const endRecording = useCallback(async () => {
    dispatch({ type: 'TRANSCRIBING' });
    try {
      const audio = await recorderRef.current.stop();
      workerRef.current.transcribe(audio);
    } catch {
      dispatch({ type: 'TRANSCRIBING_DONE' });
      dispatch({ type: 'CONTINUOUS_ACTIVE', active: false });
    }
  }, []);

  const handleToggleRecord = useCallback(async () => {
    if (state.recordingState === 'recording') {
      dispatch({ type: 'CONTINUOUS_ACTIVE', active: false });
      await endRecording();
    } else if (state.continuousActive) {
      dispatch({ type: 'CONTINUOUS_ACTIVE', active: false });
    } else if (state.recordingState === 'idle') {
      if (state.mode === 'continuous') dispatch({ type: 'CONTINUOUS_ACTIVE', active: true });
      await beginRecording();
    }
  }, [state.recordingState, state.continuousActive, state.mode, beginRecording, endRecording]);

  const handleSetMode = useCallback((mode: Mode) => {
    if (state.recordingState === 'recording') endRecording();
    else dispatch({ type: 'CONTINUOUS_ACTIVE', active: false });
    dispatch({ type: 'SET_MODE', mode });
  }, [state.recordingState, endRecording]);

  // Drain auto-correct queue on new entries
  useEffect(() => {
    if (!state.autoCorrect || state.grammarState !== 'ready') return;
    const pending = pendingAutoCorrect.current.splice(0);
    pending.forEach(({ id, text }) => {
      dispatch({ type: 'SET_CORRECTION_STATUS', id, status: 'correcting' });
      workerRef.current.correct(id, text);
    });
  }, [state.entries, state.autoCorrect, state.grammarState]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!workerRef.current.isActive) return;
      if (['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); handleToggleRecord(); }
      else if (e.code === 'Digit1') handleSetMode('manual');
      else if (e.code === 'Digit2') handleSetMode('auto');
      else if (e.code === 'Digit3') handleSetMode('continuous');
      else if (e.code === 'Escape') {
        dispatch({ type: 'CONTINUOUS_ACTIVE', active: false });
        if (state.recordingState === 'recording') endRecording();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleToggleRecord, handleSetMode, state.recordingState, endRecording]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">

        <Header
          modelState={state.modelState}
          modelLabel={state.modelLabel}
          whisperProgress={state.whisperProgress}
          onLoad={loadWhisper}
          onUnload={() => unloadWhisper(state.grammarState === 'ready')}
        />

        <div className="inline-flex w-fit rounded-lg border border-slate-800 bg-slate-950 p-1">
          {(['record', 'grammar'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => dispatch({ type: 'SET_TAB', tab })}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors',
                state.activeTab === tab
                  ? 'bg-slate-800 text-slate-50'
                  : 'text-slate-400 hover:text-slate-100',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {state.activeTab === 'record' && (
          <RecordTab
            modelReady={state.modelState === 'ready'}
            recordingState={state.recordingState}
            mode={state.mode}
            entries={state.entries}
            onToggleRecord={handleToggleRecord}
            onSetMode={handleSetMode}
          />
        )}

        {state.activeTab === 'grammar' && (
          <GrammarTab
            entries={state.entries}
            grammarChecks={state.grammarChecks}
            grammarState={state.grammarState}
            grammarProgress={state.grammarProgress}
            autoCorrect={state.autoCorrect}
            onLoadGrammar={loadGrammar}
            onAutoCorrectChange={handleAutoCorrectChange}
            onCorrectEntry={triggerCorrection}
            onCorrectAll={correctAll}
            onCheckFreeText={checkFreeText}
          />
        )}
      </div>
    </div>
  );
}
