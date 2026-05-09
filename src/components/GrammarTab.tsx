import { useState } from 'react';
import { cn } from '../lib/utils';
import type { TranscriptEntry, ModelState } from '../types';

interface Props {
  entries: TranscriptEntry[];
  grammarState: ModelState;
  grammarProgress: Record<string, number>;
  autoCorrect: boolean;
  onLoadGrammar: () => void;
  onAutoCorrectChange: (enabled: boolean) => void;
  onCorrectEntry: (id: string, text: string) => void;
  onCorrectAll: () => void;
  onCheckFreeText: (text: string) => void;
}

export default function GrammarTab({
  entries, grammarState, grammarProgress,
  autoCorrect, onLoadGrammar, onAutoCorrectChange,
  onCorrectEntry, onCorrectAll, onCheckFreeText,
}: Props) {

  const [freeText, setFreeText] = useState('');

  const grammarOverall = Object.keys(grammarProgress).length > 0
    ? Math.round(Object.values(grammarProgress).reduce((a, b) => a + b, 0) / Object.keys(grammarProgress).length)
    : 0;

  const uncorrectedCount = entries.filter(e => e.correctionStatus === 'none').length;

  return (
    <div className="flex flex-col gap-5">

      {/* Grammar model row */}
      <div className="bg-[#1a1d27] border border-[#2e3247] rounded-xl p-4 flex flex-col gap-4">
        {/* Status + load button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 text-sm">
            {grammarState === 'idle' && <span className="text-[#8b8fa8]">Grammar model not loaded</span>}
            {grammarState === 'loading' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400">Loading grammar model… {grammarOverall}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#252836] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-200"
                    style={{ width: `${grammarOverall}%` }}
                  />
                </div>
              </div>
            )}
            {grammarState === 'ready' && <span className="text-[#4ade80]">✓ Grammar model ready</span>}
          </div>
          {grammarState === 'idle' && (
            <button
              onClick={onLoadGrammar}
              className="text-sm text-[#8b8fa8] border border-[#2e3247] px-3 py-1.5 rounded-lg hover:text-[#e8eaf0] hover:border-[#8b8fa8] transition-colors shrink-0"
            >
              Load grammar model
            </button>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Toggle switch */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <button
              role="switch"
              aria-checked={autoCorrect}
              onClick={() => onAutoCorrectChange(!autoCorrect)}
              disabled={grammarState === 'loading'}
              className={cn(
                'relative w-9 h-5 rounded-full border transition-all duration-200 outline-none',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                autoCorrect
                  ? 'bg-[#6c63ff]/25 border-[#6c63ff]'
                  : 'bg-[#252836] border-[#2e3247]',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200',
                  autoCorrect ? 'left-[18px] bg-[#6c63ff]' : 'left-0.5 bg-[#8b8fa8]',
                )}
              />
            </button>
            <span className="text-sm text-[#8b8fa8]">Auto-correct new transcriptions</span>
          </label>

          <button
            onClick={onCorrectAll}
            disabled={grammarState !== 'ready' || uncorrectedCount === 0}
            className="ml-auto text-sm text-[#8b8fa8] border border-[#2e3247] px-3 py-1.5 rounded-lg hover:text-[#e8eaf0] hover:border-[#8b8fa8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Correct all {uncorrectedCount > 0 ? `(${uncorrectedCount})` : ''}
          </button>
        </div>
      </div>

      {/* Free-text input */}
      <div className="bg-[#1a1d27] border border-[#2e3247] rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold text-[#8b8fa8] uppercase tracking-widest">Check free text</h3>
        <textarea
          value={freeText}
          onChange={e => setFreeText(e.target.value)}
          placeholder="Type or paste text to check…"
          rows={3}
          className="w-full bg-[#252836] border border-[#2e3247] rounded-lg text-sm leading-relaxed text-[#e8eaf0] px-3 py-2 resize-none outline-none focus:border-[#6c63ff] transition-colors placeholder:text-[#8b8fa8]/50"
        />
        <div className="flex justify-end">
          <button
            onClick={() => { onCheckFreeText(freeText); setFreeText(''); }}
            disabled={grammarState !== 'ready' || !freeText.trim()}
            className="text-sm font-semibold bg-[#6c63ff] hover:bg-[#4c44cc] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Check grammar
          </button>
        </div>
      </div>

      {/* Entry list */}
      <div className="flex flex-col gap-3">
        {entries.length === 0 ? (
          <p className="text-sm text-[#8b8fa8] text-center py-6">
            No entries yet. Type text above or record on the Record tab.
          </p>
        ) : (
          entries.map(entry => (
            <GrammarEntryCard
              key={entry.id}
              entry={entry}
              grammarReady={grammarState === 'ready'}
              onCorrect={(text) => onCorrectEntry(entry.id, text)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Entry card ──────────────────────────────────────────────────────────────

interface CardProps {
  entry: TranscriptEntry;
  grammarReady: boolean;
  onCorrect: (text: string) => void;
}

function GrammarEntryCard({ entry, grammarReady, onCorrect }: CardProps) {
  const [editedText, setEditedText] = useState(entry.text);
  const isCorrected = entry.correctionStatus === 'done';
  const isChanged = isCorrected && entry.corrected !== entry.text;

  return (
    <div className="bg-[#1a1d27] border border-[#2e3247] rounded-xl p-4 flex flex-col gap-2 animate-fade-in">
      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-[#8b8fa8] tabular-nums">
          {entry.timestamp.toLocaleTimeString()}
        </span>

        {isCorrected && (
          <span className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded',
            isChanged
              ? 'bg-lime-400/10 text-lime-400'
              : 'bg-emerald-400/10 text-emerald-400',
          )}>
            {isChanged ? '✎ Corrected' : '✓ No changes'}
          </span>
        )}

        {entry.correctionStatus === 'correcting' && (
          <span className="text-[10px] text-amber-400">Correcting…</span>
        )}

        {entry.correctionStatus === 'none' && (
          <button
            onClick={() => onCorrect(editedText)}
            disabled={!grammarReady || !editedText.trim()}
            className="ml-auto text-xs text-[#8b8fa8] border border-[#2e3247] px-2.5 py-1 rounded-lg hover:text-[#e8eaf0] hover:border-[#8b8fa8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Correct
          </button>
        )}
      </div>

      {/* Editable text when not yet corrected */}
      {entry.correctionStatus === 'none' && (
        <textarea
          value={editedText}
          onChange={e => setEditedText(e.target.value)}
          rows={Math.max(2, Math.ceil(editedText.length / 70))}
          className="w-full bg-[#252836] border border-[#2e3247] rounded-lg text-[0.95rem] leading-relaxed text-[#e8eaf0] px-3 py-2 resize-none outline-none focus:border-[#6c63ff] transition-colors"
        />
      )}

      {/* Read-only text while correcting */}
      {entry.correctionStatus === 'correcting' && (
        <p className="text-[0.95rem] leading-relaxed text-[#e8eaf0]">{editedText}</p>
      )}

      {/* Result: original (struck through if changed) + corrected */}
      {isCorrected && (
        <>
          <p className={cn('text-[0.95rem] leading-relaxed', isChanged ? 'text-[#8b8fa8] line-through' : 'text-[#e8eaf0]')}>
            {entry.text}
          </p>
          {isChanged && (
            <p className="text-[0.95rem] leading-relaxed text-lime-400">{entry.corrected}</p>
          )}
        </>
      )}
    </div>
  );
}
