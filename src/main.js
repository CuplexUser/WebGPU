import { startRecording, stopRecording } from './audio.js';
import {
  showProgressArea, updateProgress,
  showControls, resetToLoadState,
  setRecordingState, setTranscribingState,
  clearTranscribingState, appendTranscript,
  showError, setMode,
} from './ui.js';
import { MessageTypes } from './pipeline/index.js';
import PipelineWorker from './worker.js?worker';

let worker = null;
let isRecording = false;
let currentModelLabel = '';

// 'manual' = click/Space to toggle
// 'auto'   = VAD auto-stops, then done
// 'continuous' = VAD auto-stops, then auto-restarts
let mode = 'auto';
let continuousLoopActive = false;

// ── Worker ───────────────────────────────────────────────────────────────────

function createWorker(modelId) {
  worker = new PipelineWorker();
  worker.addEventListener('message', ({ data }) => {
    switch (data.type) {
      case MessageTypes.PROGRESS:
        updateProgress(data);
        break;
      case MessageTypes.READY:
        showControls(currentModelLabel);
        break;
      case MessageTypes.RESULT:
        clearTranscribingState();
        appendTranscript(data.text);
        if (mode === 'continuous' && continuousLoopActive) {
          beginRecording();
        }
        break;
      case MessageTypes.ERROR:
        clearTranscribingState();
        continuousLoopActive = false;
        showError(data.message);
        break;
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
  resetToLoadState();
}

// ── Recording ─────────────────────────────────────────────────────────────────

async function beginRecording() {
  if (isRecording) return;
  try {
    await startRecording({
      onSilence: (mode === 'auto' || mode === 'continuous') ? onVADSilence : undefined,
    });
  } catch {
    continuousLoopActive = false;
    showError('Microphone access denied.');
    return;
  }
  isRecording = true;
  setRecordingState(true);
}

function onVADSilence() {
  if (isRecording) endRecording();
}

async function endRecording() {
  if (!isRecording) return;
  isRecording = false;
  setRecordingState(false);
  setTranscribingState();
  try {
    const audio = await stopRecording();
    worker.postMessage(
      { type: MessageTypes.TRANSCRIBE, audio, language: null },
      [audio.buffer],
    );
  } catch (err) {
    clearTranscribingState();
    continuousLoopActive = false;
    showError(err.message);
  }
}

async function handleToggleRecord() {
  if (isRecording) {
    // User manually stops — always ends the continuous loop too
    continuousLoopActive = false;
    await endRecording();
  } else if (continuousLoopActive) {
    // Tap while between recordings in continuous mode → cancel loop
    continuousLoopActive = false;
    setMode(mode);
  } else {
    if (mode === 'continuous') continuousLoopActive = true;
    await beginRecording();
  }
}

// ── Mode ──────────────────────────────────────────────────────────────────────

function setModeAndUpdate(newMode) {
  // Stop any active recording when switching modes
  if (isRecording) {
    continuousLoopActive = false;
    endRecording();
  } else {
    continuousLoopActive = false;
  }
  mode = newMode;
  setMode(mode);
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('load-btn').addEventListener('click', () => {
  const select = document.getElementById('model');
  currentModelLabel = select.options[select.selectedIndex].text;
  document.getElementById('load-btn').disabled = true;
  document.getElementById('model').disabled = true;
  showProgressArea();
  createWorker(select.value);
});

document.getElementById('unload-btn').addEventListener('click', unloadModel);

document.getElementById('record-btn').addEventListener('click', () => {
  if (!worker) return;
  handleToggleRecord();
});

// Mode buttons
document.getElementById('mode-auto').addEventListener('click', () => setModeAndUpdate('auto'));
document.getElementById('mode-continuous').addEventListener('click', () => setModeAndUpdate('continuous'));

// Keyboard shortcuts — only active when model is loaded
document.addEventListener('keydown', (e) => {
  if (!worker) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;

  if (e.code === 'Space') {
    e.preventDefault();
    handleToggleRecord();
  } else if (e.code === 'Digit1') {
    setModeAndUpdate('manual');
  } else if (e.code === 'Digit2') {
    setModeAndUpdate('auto');
  } else if (e.code === 'Digit3') {
    setModeAndUpdate('continuous');
  } else if (e.code === 'Escape') {
    if (isRecording || continuousLoopActive) {
      continuousLoopActive = false;
      if (isRecording) endRecording();
      else setMode(mode);
    }
  }
});
