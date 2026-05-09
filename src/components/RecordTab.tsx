import { Clock, Mic, Radio, ScrollText, Waves } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Mode, TranscriptEntry } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  modelReady: boolean;
  recordingState: 'idle' | 'recording' | 'transcribing';
  mode: Mode;
  entries: TranscriptEntry[];
  onToggleRecord: () => void;
  onSetMode: (mode: Mode) => void;
}

export default function RecordTab({ modelReady, recordingState, mode, entries, onToggleRecord, onSetMode }: Props) {
  const isRecording = recordingState === 'recording';
  const isTranscribing = recordingState === 'transcribing';
  const isDisabled = !modelReady || isTranscribing;

  const hint: Record<Mode, string> = {
    manual:     'Space to toggle',
    auto:       'Space to start · stops on silence',
    continuous: 'Space to start · Esc to stop loop',
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio size={17} className="text-sky-300" />
            Capture
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-5">
          <button
            onClick={onToggleRecord}
            disabled={isDisabled}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            className={cn(
              'flex h-32 w-32 items-center justify-center rounded-full border outline-none transition-all duration-200',
              'focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
              'disabled:cursor-not-allowed disabled:opacity-40',
              isRecording
                ? 'animate-pulse-ring border-rose-400 bg-rose-500/10 text-rose-300'
                : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-sky-400 hover:text-sky-300',
            )}
          >
            <Mic size={42} />
          </button>

          <div className="grid w-full grid-cols-2 gap-2">
            {(['auto', 'continuous'] as const).map((m) => (
              <Button
                key={m}
                onClick={() => onSetMode(m)}
                disabled={!modelReady}
                variant={mode === m ? 'primary' : 'secondary'}
                size="sm"
                className="h-9"
              >
                {m === 'auto' ? 'Auto-stop' : 'Continuous'}
                <kbd className={cn('rounded border px-1 text-[10px]', mode === m ? 'border-slate-950/30' : 'border-slate-600')}>
                  {m === 'auto' ? '2' : '3'}
                </kbd>
              </Button>
            ))}
          </div>

          <div className="flex min-h-16 w-full items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
            <Waves size={18} className={isRecording ? 'text-rose-300' : 'text-slate-500'} />
            <span className="text-sm text-slate-300">
              {!modelReady ? 'Load a speech-to-text model above to start recording'
                : isRecording ? 'Listening'
                : isTranscribing ? 'Transcribing'
                : hint[mode]}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ScrollText size={17} className="text-emerald-300" />
            Transcript
          </CardTitle>
          <Badge>{entries.length} items</Badge>
        </CardHeader>
        <CardContent className="max-h-[520px] overflow-y-auto p-0">
          {entries.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">
              Transcriptions will appear here after you record.
            </p>
          ) : (
            <div className="divide-y divide-slate-800">
              {entries.map(entry => (
                <article key={entry.id} className="animate-fade-in px-5 py-4">
                  <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={14} />
                    <span className="tabular-nums">{entry.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <p className="text-base leading-7 text-slate-100">{entry.text}</p>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
