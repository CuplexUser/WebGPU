// ── Progress (Whisper model load) ─────────────────────────────────────────────

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

// ── Whisper model state ───────────────────────────────────────────────────────

export function showControls(modelLabel) {
  document.getElementById('progress-area').hidden = true;
  document.getElementById('controls').hidden = false;
  document.getElementById('record-btn').disabled = false;
  document.getElementById('model-selector').hidden = true;
  document.getElementById('model-loaded').hidden = false;
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

// ── Tabs ──────────────────────────────────────────────────────────────────────

export function initTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = true; });
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`).hidden = false;
    });
  });
}

// ── Recording mode ────────────────────────────────────────────────────────────

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
  document.getElementById('record-btn').classList.toggle('recording', isRecording);
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

function setStatus(text) {
  const el = document.getElementById('status');
  el.textContent = text;
  el.classList.remove('status-error');
}

export function showError(message) {
  const el = document.getElementById('status');
  el.textContent = `Error: ${message}`;
  el.classList.add('status-error');
}

// ── Transcript (Record tab) ───────────────────────────────────────────────────

export function addTranscriptEntry(id, text) {
  document.getElementById('transcript-empty').hidden = true;

  const entry = document.createElement('div');
  entry.className = 'transcript-entry';
  entry.id = `tr-${id}`;

  const time = document.createElement('span');
  time.className = 'entry-time';
  time.textContent = new Date().toLocaleTimeString();

  const p = document.createElement('p');
  p.className = 'entry-text';
  p.textContent = text;

  entry.appendChild(time);
  entry.appendChild(p);
  document.getElementById('transcript').prepend(entry);
}

// ── Grammar tab ───────────────────────────────────────────────────────────────

const grammarFileProgress = new Map();

export function updateGrammarProgress(event) {
  const { file, progress, status } = event;
  const el = document.getElementById('grammar-model-status');

  if (file) {
    if (status === 'initiate') grammarFileProgress.set(file, 0);
    else if (status === 'downloading') grammarFileProgress.set(file, progress ?? 0);
    else if (status === 'done') grammarFileProgress.set(file, 100);
  }

  if (grammarFileProgress.size > 0) {
    const sum = [...grammarFileProgress.values()].reduce((a, b) => a + b, 0);
    const overall = Math.round(sum / grammarFileProgress.size);
    el.textContent = `Loading grammar model… ${overall}%`;
    el.className = 'grammar-status-loading';
  }
}

export function setGrammarModelReady() {
  grammarFileProgress.clear();
  document.getElementById('grammar-model-status').textContent = 'Grammar model ready';
  document.getElementById('grammar-model-status').className = 'grammar-status-ready';
  document.getElementById('grammar-load-btn').hidden = true;
  document.getElementById('auto-correct-toggle').disabled = false;
  document.getElementById('correct-all-btn').disabled = false;
}

export function setGrammarModelLoading() {
  document.getElementById('grammar-model-status').textContent = 'Loading grammar model… 0%';
  document.getElementById('grammar-model-status').className = 'grammar-status-loading';
  document.getElementById('grammar-load-btn').disabled = true;
}

export function addGrammarEntry(id, text) {
  document.getElementById('grammar-empty').hidden = true;

  const entry = document.createElement('div');
  entry.className = 'grammar-entry';
  entry.id = `ge-${id}`;

  const meta = document.createElement('div');
  meta.className = 'grammar-entry-meta';

  const time = document.createElement('span');
  time.className = 'entry-time';
  time.textContent = new Date().toLocaleTimeString();

  const correctBtn = document.createElement('button');
  correctBtn.className = 'correct-btn secondary-btn';
  correctBtn.textContent = 'Correct';
  correctBtn.dataset.id = id;
  correctBtn.dataset.text = text;

  meta.appendChild(time);
  meta.appendChild(correctBtn);

  const originalP = document.createElement('p');
  originalP.className = 'original-text';
  originalP.textContent = text;

  entry.appendChild(meta);
  entry.appendChild(originalP);
  document.getElementById('grammar-entries').prepend(entry);

  return correctBtn;
}

export function setGrammarEntryState(id, state) {
  const entry = document.getElementById(`ge-${id}`);
  if (!entry) return;
  const btn = entry.querySelector('.correct-btn');

  if (state === 'correcting') {
    if (btn) { btn.textContent = 'Correcting…'; btn.disabled = true; }
  }
}

export function resetGrammarState() {
  document.getElementById('grammar-model-status').textContent = 'Grammar model not loaded';
  document.getElementById('grammar-model-status').className = 'grammar-status-idle';
  document.getElementById('grammar-load-btn').hidden = false;
  document.getElementById('grammar-load-btn').disabled = false;
  document.getElementById('auto-correct-toggle').checked = false;
  document.getElementById('auto-correct-toggle').disabled = true;
  document.getElementById('correct-all-btn').disabled = true;
  grammarFileProgress.clear();
}

export function applyCorrection(id, corrected, original) {
  const entry = document.getElementById(`ge-${id}`);
  if (!entry) return;

  const btn = entry.querySelector('.correct-btn');
  if (btn) btn.remove();

  const originalP = entry.querySelector('.original-text');

  if (corrected === original) {
    // No change — just mark as checked
    const badge = document.createElement('span');
    badge.className = 'badge badge-ok';
    badge.textContent = '✓ No changes';
    entry.querySelector('.grammar-entry-meta').appendChild(badge);
    return;
  }

  originalP.classList.add('original-struck');

  const correctedP = document.createElement('p');
  correctedP.className = 'corrected-text';
  correctedP.textContent = corrected;

  const badge = document.createElement('span');
  badge.className = 'badge badge-corrected';
  badge.textContent = '✎ Corrected';
  entry.querySelector('.grammar-entry-meta').appendChild(badge);

  entry.appendChild(correctedP);
}
