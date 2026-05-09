const fileProgress = new Map();

export function showProgressArea() {
  document.getElementById('progress-area').hidden = false;
}

export function updateProgress(event) {
  const { file, progress, status, message } = event;

  if (status === 'warn') {
    document.getElementById('progress-label').textContent = message ?? 'Warning';
    return;
  }

  if (file) {
    if (status === 'initiate') fileProgress.set(file, 0);
    else if (status === 'downloading') fileProgress.set(file, progress ?? 0);
    else if (status === 'done') fileProgress.set(file, 100);
  }

  if (fileProgress.size > 0) {
    const sum = [...fileProgress.values()].reduce((a, b) => a + b, 0);
    const overall = sum / fileProgress.size;
    document.getElementById('progress-bar').value = overall;
    document.getElementById('progress-detail').textContent =
      `${fileProgress.size} file(s) — ${Math.round(overall)}%`;
  }

  const labels = {
    initiate: 'Initializing model files...',
    downloading: 'Downloading model...',
    done: 'Finalizing...',
    ready: 'Model ready!',
  };
  document.getElementById('progress-label').textContent = labels[status] ?? 'Loading...';
}

export function showControls(modelLabel) {
  document.getElementById('progress-area').hidden = true;
  document.getElementById('controls').hidden = false;
  document.getElementById('record-btn').disabled = false;
  document.getElementById('model-selector').hidden = true;
  const loaded = document.getElementById('model-loaded');
  loaded.hidden = false;
  document.getElementById('loaded-label').textContent = modelLabel;
  setMode('auto');
}

export function resetToLoadState() {
  document.getElementById('model-selector').hidden = false;
  document.getElementById('model-loaded').hidden = true;
  document.getElementById('model').disabled = false;
  document.getElementById('load-btn').disabled = false;
  document.getElementById('progress-area').hidden = true;
  document.getElementById('controls').hidden = true;
  document.getElementById('record-btn').disabled = true;
  setStatus('');
  fileProgress.clear();
  document.getElementById('progress-bar').value = 0;
  document.getElementById('progress-detail').textContent = '';
}

// Updates mode button active states and record button hint
export function setMode(mode) {
  document.getElementById('mode-auto').classList.toggle('active', mode === 'auto');
  document.getElementById('mode-continuous').classList.toggle('active', mode === 'continuous');

  const hints = {
    manual:     'Space to toggle',
    auto:       'Space to start · stops on silence',
    continuous: 'Space to start · Esc to stop loop',
  };
  document.querySelector('.btn-label').textContent = hints[mode] ?? 'Space to record';
}

export function setRecordingState(isRecording) {
  const btn = document.getElementById('record-btn');
  btn.classList.toggle('recording', isRecording);
  setStatus(isRecording ? 'Listening...' : '');
}

export function setTranscribingState() {
  setStatus('Transcribing...');
  document.getElementById('record-btn').disabled = true;
}

export function clearTranscribingState() {
  setStatus('');
  document.getElementById('record-btn').disabled = false;
}

export function appendTranscript(text) {
  const area = document.getElementById('transcript');
  const entry = document.createElement('div');
  entry.className = 'transcript-entry';

  const time = document.createElement('span');
  time.className = 'entry-time';
  time.textContent = new Date().toLocaleTimeString();

  const p = document.createElement('p');
  p.className = 'entry-text';
  p.textContent = text;

  entry.appendChild(time);
  entry.appendChild(p);
  // Prepend so newest entries appear at top
  area.prepend(entry);

  document.getElementById('transcript-empty').hidden = true;
}

export function showError(message) {
  const status = document.getElementById('status');
  status.textContent = `Error: ${message}`;
  status.classList.add('status-error');
}

function setStatus(text) {
  const status = document.getElementById('status');
  status.textContent = text;
  status.classList.remove('status-error');
}
