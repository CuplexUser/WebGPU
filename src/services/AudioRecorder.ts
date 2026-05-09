export interface RecordingOptions {
  onSilence?: () => void;
  silenceDelay?: number;
  silenceThreshold?: number;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private analyserCtx: AudioContext | null = null;
  private animFrameId: number | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;

  async start(options: RecordingOptions = {}): Promise<void> {
    const { onSilence, silenceDelay = 1500, silenceThreshold = 0.01 } = options;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });

    this.audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/ogg;codecs=opus';

    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.mediaRecorder.addEventListener('dataavailable', (e: BlobEvent) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    });
    this.mediaRecorder.start(250);

    if (onSilence) this.startVAD(stream, onSilence, silenceDelay, silenceThreshold);
  }

  stop(): Promise<Float32Array> {
    this.stopVAD();
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) { reject(new Error('Not recording')); return; }
      const stream = this.mediaRecorder.stream;
      this.mediaRecorder.addEventListener('stop', async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(this.audioChunks, { type: this.mediaRecorder!.mimeType });
        try { resolve(await this.blobToFloat32Mono16k(blob)); }
        catch (err) { reject(err); }
      });
      this.mediaRecorder.stop();
    });
  }

  private startVAD(stream: MediaStream, onSilence: () => void, delay: number, threshold: number): void {
    this.analyserCtx = new AudioContext();
    const source = this.analyserCtx.createMediaStreamSource(stream);
    const analyser = this.analyserCtx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);

    const buffer = new Float32Array(analyser.fftSize);
    let hasSpeech = false;

    const tick = (): void => {
      if (!this.analyserCtx) return;
      analyser.getFloatTimeDomainData(buffer);
      const rms = Math.sqrt(buffer.reduce((s, v) => s + v * v, 0) / buffer.length);

      if (rms > threshold) {
        hasSpeech = true;
        if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
      } else if (hasSpeech && !this.silenceTimer) {
        this.silenceTimer = setTimeout(onSilence, delay);
      }
      this.animFrameId = requestAnimationFrame(tick);
    };

    this.animFrameId = requestAnimationFrame(tick);
  }

  private stopVAD(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.analyserCtx?.close();
    this.analyserCtx = null;
    this.animFrameId = null;
    this.silenceTimer = null;
  }

  // Converts any audio Blob → mono Float32Array at exactly 16 kHz.
  // Uses OfflineAudioContext for explicit resampling — AudioContext({ sampleRate })
  // does NOT reliably resample during decodeAudioData in Chrome.
  private async blobToFloat32Mono16k(blob: Blob): Promise<Float32Array> {
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
}
