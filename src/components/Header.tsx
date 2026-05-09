import { useState } from 'react';
import { CheckCircle2, Cpu, Download, RotateCcw } from 'lucide-react';
import type { ModelState } from '../types';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';

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
    <header className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-sky-300">
            <Cpu size={22} />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
              Speech Workspace
            </h1>
            <p className="text-sm text-slate-400">
              Local WebGPU transcription with a separate grammar review desk.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          {modelState === 'idle' && (
            <>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 sm:shrink-0">
                <Download size={16} className="text-slate-500" />
                Model
              </label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none transition-colors focus:border-sky-400"
              >
                {MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={() => {
                  const m = MODELS.find(m => m.id === selectedModel)!;
                  onLoad(m.id, m.label);
                }}
                className="sm:shrink-0"
              >
                Load Model
              </Button>
            </>
          )}

          {modelState === 'loading' && (
            <div className="flex w-full flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Downloading model</span>
                <span className="tabular-nums text-slate-400">{overall}%</span>
              </div>
              <Progress value={overall} />
            </div>
          )}

          {modelState === 'ready' && (
            <>
              <CheckCircle2 size={20} className="text-emerald-300" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{modelLabel}</span>
              <Button onClick={onUnload} size="sm">
                <RotateCcw size={15} />
                Change model
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </header>
  );
}
