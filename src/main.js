import { startRecording, stopRecording } from './audio.js';
import {
  showProgressArea, updateProgress,
  showControls, resetToLoadState,
  setRecordingState, setTranscribingState,
  clearTranscribingState, showError,
  setMode, initTabs,
  addTranscriptEntry, addGrammarEntry,
  setGrammarEntryState, applyCorrection,
  updateGrammarProgress, setGrammarModelReady, setGrammarModelLoading,
  resetGrammarState,
} from './ui.js';
import { MessageTypes } from './pipeline/index.js';
import PipelineWorker from './worker.js?worker';

const GRAMMAR_MODEL = 'Xenova/grammar-synthesis-small';

let worker = null;
let isRecording = false;
let currentModelLabel = '';
let mode = 'auto';
let continuousLoopActive = false;

let grammarReady = false;
let autoCorrect = false;

// Per-entry correct button callbacks — maps id → correctBtn element
const grammarButtons = new Map();

initTabs();

// ── Worker ────────────────────────────────────────────────────────────────────

function createWorker(modelId) {
  worker = new PipelineWorker();
  worker.addEventListener('message', ({ data }) => {
    const { type } = data;

    if (type === MessageTypes.PROGRESS) {
      if (data.stage === 'grammar') updateGrammarProgress(data);
      else updateProgress(data);

    } else if (type === MessageTypes.READY) {
      showControls(currentModelLabel);

    } else if (type === MessageTypes.GRAMMAR_READY) {
      grammarReady = true;
      setGrammarModelReady();

    } else if (type === MessageTypes.RESULT) {
      clearTranscribingState();
      const id = `${Date.now()}`;
      addTranscriptEntry(id, data.text);
      const btn = addGrammarEntry(id, data.text);
      btn.addEventListener('click', () => triggerCorrection(id, data.text));
      grammarButtons.set(id, btn);
      if (autoCorrect && grammarReady) triggerCorrection(id, data.text);
      if (mode === 'continuous' && continuousLoopActive) beginRecording();

    } else if (type === MessageTypes.CORRECTION) {
      applyCorrection(data.id, data.corrected, data.original);
      grammarButtons.delete(data.id);

    } else if (type === MessageTypes.ERROR) {
      clearTranscribingState();
      continuousLoopActive = false;
      showError(data.message);
    }
  });
  worker.addEventListener('error', (e) => {
    continuousLoopActive = false;
    showError(e.message);
  });
  worker.postMessage({ type: MessageTypes.LOAD, model: modelId, device: 'webgpu' });
}

function unloadModel() {
  continuousLoopActive = false;
  if (worker) { worker.terminate(); worker = null; }
  isRecording = false;
  grammarReady = false;
  autoCorrect = false;
  grammarButtons.clear();
  resetGrammarState();
  resetToLoadState();
}

// ── Grammar ───────────────────────────────────────────────────────────────────

function loadGrammarModel() {
  if (!worker || grammarReady) return;
  setGrammarModelLoading();
  worker.postMessage({ type: MessageTypes.LOAD_GRAMMAR, model: GRAMMAR_MODEL });
}

function triggerCorrection(id, text) {
  if (!grammarReady || !worker) return;
  setGrammarEntryState(id, 'correcting');
  worker.postMessage({ type: MessageTypes.CORRECT, id, text });
}

document.getElementById('grammar-load-btn').addEventListener('click', loadGrammarModel);

document.getElementById('auto-correct-toggle').addEventListener('change', (e) => {
  autoCorrect = e.target.checked;
  if (autoCorrect && !grammarReady) loadGrammarModel();
});

document.getElementById('correct-all-btn').addEventListener('click', () => {
  grammarButtons.forEach((btn, id) => {
    const text = btn.dataset.text;
    triggerCorrection(id, text);
  });
});

// ── Whisper model load/unload ─────────────────────────────────────────────────

document.getElementById('load-btn').addEventListener('click', () => {
  const select = document.getElementById('model');
  currentModelLabel = select.options[select.selectedIndex].text;
  document.getElementById('load-btn').disabled = true;
  document.getElementById('model').disabled = true;
  showProgressArea();
  createWorker(select.value);
});

document.getElementById('unload-btn').addEventListener('click', unloadModel);

// ── Recording ─────────────────────────────────────────────────────────────────

async function beginRecording() {
  if (isRecording) return;
  try {
    await startRecording({
      onSilence: (mode === 'auto' || mode === 'continuous') ? () => { if (isRecording) endRecording(); } : undefined,
    });
  } catch {
    continuousLoopActive = false;
    showError('Microphone access denied.');
    return;
  }
  isRecording = true;
  setRecordingState(true);
}

async function endRecording() {
  if (!isRecording) return;
  isRecording = false;
  setRecordingState(false);
  setTranscribingState();
  try {
    const audio = await stopRecording();
    worker.postMessage({ type: MessageTypes.TRANSCRIBE, audio, language: null }, [audio.buffer]);
  } catch (err) {
    clearTranscribingState();
    continuousLoopActive = false;
    showError(err.message);
  }
}

async function handleToggleRecord() {
  if (isRecording) {
    continuousLoopActive = false;
    await endRecording();
  } else if (continuousLoopActive) {
    continuousLoopActive = false;
    setMode(mode);
  } else {
    if (mode === 'continuous') continuousLoopActive = true;
    await beginRecording();
  }
}

function setModeAndUpdate(newMode) {
  if (isRecording) { continuousLoopActive = false; endRecording(); }
  else continuousLoopActive = false;
  mode = newMode;
  setMode(mode);
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('record-btn').addEventListener('click', () => { if (worker) handleToggleRecord(); });
document.getElementById('mode-auto').addEventListener('click', () => setModeAndUpdate('auto'));
document.getElementById('mode-continuous').addEventListener('click', () => setModeAndUpdate('continuous'));

document.addEventListener('keydown', (e) => {
  if (!worker) return;
  if (['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); handleToggleRecord(); }
  else if (e.code === 'Digit1') setModeAndUpdate('manual');
  else if (e.code === 'Digit2') setModeAndUpdate('auto');
  else if (e.code === 'Digit3') setModeAndUpdate('continuous');
  else if (e.code === 'Escape') {
    if (isRecording || continuousLoopActive) {
      continuousLoopActive = false;
      if (isRecording) endRecording();
      else setMode(mode);
    }
  }
});
