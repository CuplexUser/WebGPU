import { useState } from 'react';
import type { ModelState } from '../types';

interface Props {
  modelState: ModelState;
  modelLabel: string;
  whisperProgress: Record<string, number>;
  onLoad: (modelId: string, modelLabel: string) => void;
  onUnload: () => void;
}

const MODELS = [
  { id: 'Xenova/whisper-tiny',  label: 'Whisper Tiny (~39 MB, fastest)' },
  { id: 'Xenova/whisper-base',  label: 'Whisper Base (~74 MB, recommended)' },
  { id: 'Xenova/whisper-small', label: 'Whisper Small (~244 MB, high memory)' },
];

export default function Header({ modelState, modelLabel, whisperProgress, onLoad, onUnload }: Props) {
  const [selectedModel, setSelectedModel] = useState(MODELS[1].id);

  const overall = Object.keys(whisperProgress).length > 0
    ? Math.round(Object.values(whisperProgress).reduce((a, b) => a + b, 0) / Object.keys(whisperProgress).length)
    : 0;

  return (
    <header className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-[#e8eaf0] to-[#6c63ff] bg-clip-text text-transparent">
          Speech to Text
        </h1>
        <p className="text-sm text-[#8b8fa8] mt-1">
          WebGPU-accelerated transcription via Whisper — runs entirely in your browser
        </p>
      </div>

      {/* Model selector / loaded row */}
      <div className="flex items-center gap-3 flex-wrap bg-[#1a1d27] border border-[#2e3247] rounded-xl px-4 py-3">
        {modelState === 'idle' && (
          <>
            <label className="text-sm text-[#8b8fa8] shrink-0">Model</label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="flex-1 min-w-0 bg-[#252836] border border-[#2e3247] rounded-lg text-sm text-[#e8eaf0] px-3 py-2 outline-none focus:border-[#6c63ff] appearance-none cursor-pointer"
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const m = MODELS.find(m => m.id === selectedModel)!;
                onLoad(m.id, m.label);
              }}
              className="bg-[#6c63ff] hover:bg-[#4c44cc] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shrink-0"
            >
              Load Model
            </button>
          </>
        )}

        {modelState === 'loading' && (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#8b8fa8]">Downloading model…</span>
              <span className="text-[#8b8fa8] tabular-nums">{overall}%</span>
            </div>
            <div className="h-1.5 w-full bg-[#252836] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#6c63ff] to-[#a78bfa] rounded-full transition-all duration-200"
                style={{ width: `${overall}%` }}
              />
            </div>
          </div>
        )}

        {modelState === 'ready' && (
          <>
            <span className="text-[#4ade80] text-base">✓</span>
            <span className="flex-1 text-sm font-medium text-[#e8eaf0]">{modelLabel}</span>
            <button
              onClick={onUnload}
              className="text-sm text-[#8b8fa8] border border-[#2e3247] px-3 py-1.5 rounded-lg hover:text-[#e8eaf0] hover:border-[#8b8fa8] transition-colors"
            >
              Change model
            </button>
          </>
        )}
      </div>
    </header>
  );
}
