import { Mic } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Mode, TranscriptEntry } from '../types';

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
    <div className="flex flex-col gap-5">
      {/* Record button + controls */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onToggleRecord}
          disabled={isDisabled}
          className={cn(
            'w-28 h-28 rounded-full flex flex-col items-center justify-center',
            'border-2 transition-all duration-200 select-none outline-none',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            isRecording
              ? 'bg-red-500/10 border-red-500 animate-pulse-ring'
              : 'bg-[#1a1d27] border-[#2e3247] hover:border-[#6c63ff] hover:bg-[#252836]',
          )}
        >
          <Mic
            size={36}
            className={cn(
              'transition-colors',
              isRecording ? 'text-red-500' : 'text-[#8b8fa8]',
            )}
          />
        </button>

        {/* Mode bar */}
        <div className="flex gap-2">
          {(['auto', 'continuous'] as const).map((m) => (
            <button
              key={m}
              onClick={() => onSetMode(m)}
              disabled={!modelReady}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                mode === m
                  ? 'bg-[#6c63ff]/15 text-[#6c63ff] border-[#6c63ff]'
                  : 'bg-[#252836] text-[#8b8fa8] border-[#2e3247] hover:text-[#e8eaf0]',
              )}
            >
              {m === 'auto' ? 'Auto-stop' : 'Continuous'}
              <kbd className="ml-1.5 text-[10px] border border-current/30 rounded px-1">
                {m === 'auto' ? '2' : '3'}
              </kbd>
            </button>
          ))}
        </div>

        {/* Status */}
        <span className="text-sm text-[#8b8fa8] min-h-5">
          {!modelReady ? 'Load a speech-to-text model above to start recording'
            : isRecording ? 'Listening…'
            : isTranscribing ? 'Transcribing…'
            : hint[mode]}
        </span>
      </div>

      {/* Transcript */}
      <div className="bg-[#1a1d27] border border-[#2e3247] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2e3247]">
          <h2 className="text-xs font-semibold text-[#8b8fa8] uppercase tracking-widest">Transcript</h2>
        </div>
        <div className="max-h-80 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-thin">
          {entries.length === 0 ? (
            <p className="text-sm text-[#8b8fa8] text-center py-8">
              Transcriptions will appear here after you record.
            </p>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="flex flex-col gap-0.5 animate-fade-in">
                <span className="text-xs text-[#8b8fa8] tabular-nums">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
                <p className="text-base leading-relaxed text-[#e8eaf0]">{entry.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
