let mediaRecorder = null;
let audioChunks = [];

// VAD state
let analyserCtx = null;
let animFrameId = null;
let silenceTimer = null;

export async function startRecording({ onSilence, silenceDelay = 1500, silenceThreshold = 0.01 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  audioChunks = [];
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/ogg;codecs=opus';

  mediaRecorder = new MediaRecorder(stream, { mimeType });
  mediaRecorder.addEventListener('dataavailable', (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  });
  mediaRecorder.start(250);

  if (onSilence) {
    startVAD(stream, onSilence, silenceDelay, silenceThreshold);
  }
}

function startVAD(stream, onSilence, delay, threshold) {
  analyserCtx = new AudioContext();
  const source = analyserCtx.createMediaStreamSource(stream);
  const analyser = analyserCtx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  const buffer = new Float32Array(analyser.fftSize);
  // Wait for initial speech before arming silence detection,
  // so a quiet room doesn't immediately fire the callback.
  let hasSpeech = false;

  function tick() {
    if (!analyserCtx) return;
    analyser.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((s, v) => s + v * v, 0) / buffer.length);

    if (rms > threshold) {
      hasSpeech = true;
      clearTimeout(silenceTimer);
      silenceTimer = null;
    } else if (hasSpeech && !silenceTimer) {
      silenceTimer = setTimeout(onSilence, delay);
    }

    animFrameId = requestAnimationFrame(tick);
  }

  animFrameId = requestAnimationFrame(tick);
}

function stopVAD() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  clearTimeout(silenceTimer);
  analyserCtx?.close();
  analyserCtx = null;
  animFrameId = null;
  silenceTimer = null;
}

export function stopRecording() {
  stopVAD();
  return new Promise((resolve, reject) => {
    const stream = mediaRecorder.stream;
    mediaRecorder.addEventListener('stop', async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType });
      try {
        resolve(await blobToFloat32Mono16k(blob));
      } catch (err) {
        reject(err);
      }
    });
    mediaRecorder.stop();
  });
}

// Converts any audio Blob → mono Float32Array at exactly 16 kHz.
// OfflineAudioContext is used for explicit resampling — AudioContext({ sampleRate })
// does NOT reliably resample during decodeAudioData in Chrome.
async function blobToFloat32Mono16k(blob) {
  const arrayBuffer = await blob.arrayBuffer();

  const decodeCtx = new AudioContext();
  const original = await decodeCtx.decodeAudioData(arrayBuffer);
  await decodeCtx.close();

  const targetRate = 16000;
  const frameCount = Math.ceil(original.duration * targetRate);
  const offlineCtx = new OfflineAudioContext(1, frameCount, targetRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = original;
  source.connect(offlineCtx.destination);
  source.start(0);

  const resampled = await offlineCtx.startRendering();
  return resampled.getChannelData(0).slice();
}
