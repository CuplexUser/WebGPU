import { useState } from 'react';
import { cn } from '../lib/utils';
import { Check, FileCheck2, Loader2, PencilLine, Sparkles, Wand2 } from 'lucide-react';
import type { GrammarCheck, TranscriptEntry, ModelState } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';

interface Props {
  entries: TranscriptEntry[];
  grammarChecks: GrammarCheck[];
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
  entries, grammarChecks, grammarState, grammarProgress,
  autoCorrect, onLoadGrammar, onAutoCorrectChange,
  onCorrectEntry, onCorrectAll, onCheckFreeText,
}: Props) {

  const [freeText, setFreeText] = useState('');

  const grammarOverall = Object.keys(grammarProgress).length > 0
    ? Math.round(Object.values(grammarProgress).reduce((a, b) => a + b, 0) / Object.keys(grammarProgress).length)
    : 0;

  const uncorrectedCount = entries.filter(e => e.correctionStatus === 'none').length;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles size={17} className="text-amber-300" />
              Grammar model
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 text-sm">
                {grammarState === 'idle' && <span className="text-slate-400">Grammar model not loaded</span>}
            {grammarState === 'loading' && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                      <span className="text-amber-300">Loading grammar model</span>
                      <span className="tabular-nums text-slate-400">{grammarOverall}%</span>
                </div>
                    <Progress value={grammarOverall} indicatorClassName="bg-amber-300" />
              </div>
            )}
                {grammarState === 'ready' && <span className="text-emerald-300">Grammar model ready</span>}
          </div>
          {grammarState === 'idle' && (
                <Button onClick={onLoadGrammar} size="sm">
                  <Wand2 size={15} />
              Load grammar model
                </Button>
          )}
        </div>

            <div className="flex flex-wrap items-center gap-3">
              <Switch
                checked={autoCorrect}
              disabled={grammarState === 'loading'}
                onCheckedChange={onAutoCorrectChange}
                label="Auto-correct new transcriptions"
              />
              <Button
            onClick={onCorrectAll}
            disabled={grammarState !== 'ready' || uncorrectedCount === 0}
                size="sm"
                className="ml-auto"
          >
                <FileCheck2 size={15} />
            Correct all {uncorrectedCount > 0 ? `(${uncorrectedCount})` : ''}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transcript review</CardTitle>
            <Badge>{entries.length} items</Badge>
          </CardHeader>
          <CardContent className="flex max-h-[620px] flex-col gap-3 overflow-y-auto">
            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Recorded transcript entries will be available here for grammar correction.
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
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Check free text</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="Type or paste text to check..."
              rows={7}
              className="w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm leading-6 text-slate-100 outline-none transition-colors placeholder:text-slate-500 focus:border-sky-400"
            />
            <Button
              variant="primary"
              onClick={() => { onCheckFreeText(freeText.trim()); setFreeText(''); }}
              disabled={grammarState !== 'ready' || !freeText.trim()}
              className="self-end"
            >
              <Wand2 size={16} />
              Check grammar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Free text output</CardTitle>
            <Badge>{grammarChecks.length} checks</Badge>
          </CardHeader>
          <CardContent className="max-h-[450px] overflow-y-auto p-0">
            {grammarChecks.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-500">
                Free-text grammar results will appear here, separate from the transcript.
              </p>
            ) : (
              <div className="divide-y divide-slate-800">
                {grammarChecks.map(check => (
                  <GrammarCheckResult key={check.id} check={check} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
    <article className="animate-fade-in rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 tabular-nums">
          {entry.timestamp.toLocaleTimeString()}
        </span>

        {isCorrected && (
          <Badge variant={isChanged ? 'info' : 'success'}>
            {isChanged ? <PencilLine size={12} /> : <Check size={12} />}
            {isChanged ? 'Corrected' : 'No changes'}
          </Badge>
        )}

        {entry.correctionStatus === 'correcting' && (
          <Badge variant="warning">
            <Loader2 size={12} className="animate-spin" />
            Correcting
          </Badge>
        )}

        {entry.correctionStatus === 'none' && (
          <Button
            onClick={() => onCorrect(editedText)}
            disabled={!grammarReady || !editedText.trim()}
            size="sm"
            className="ml-auto"
          >
            Correct
          </Button>
        )}
      </div>

      {entry.correctionStatus === 'none' && (
        <textarea
          value={editedText}
          onChange={e => setEditedText(e.target.value)}
          rows={Math.max(2, Math.ceil(editedText.length / 70))}
          className="mt-3 w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm leading-6 text-slate-100 outline-none transition-colors focus:border-sky-400"
        />
      )}

      {entry.correctionStatus === 'correcting' && (
        <p className="mt-3 text-sm leading-6 text-slate-200">{editedText}</p>
      )}

      {isCorrected && (
        <div className="mt-3 flex flex-col gap-2">
          <p className={cn('text-sm leading-6', isChanged ? 'text-slate-500 line-through' : 'text-slate-100')}>
            {entry.text}
          </p>
          {isChanged && (
            <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm leading-6 text-emerald-100">{entry.corrected}</p>
          )}
        </div>
      )}
    </article>
  );
}

function GrammarCheckResult({ check }: { check: GrammarCheck }) {
  const isDone = check.correctionStatus === 'done';
  const isChanged = isDone && check.corrected !== check.text;

  return (
    <article className="animate-fade-in px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs tabular-nums text-slate-500">{check.timestamp.toLocaleTimeString()}</span>
        {isDone ? (
          <Badge variant={isChanged ? 'info' : 'success'}>{isChanged ? 'Corrected' : 'No changes'}</Badge>
        ) : (
          <Badge variant="warning">
            <Loader2 size={12} className="animate-spin" />
            Checking
          </Badge>
        )}
      </div>
      <p className={cn('text-sm leading-6', isChanged ? 'text-slate-500 line-through' : 'text-slate-100')}>
        {check.text}
      </p>
      {isChanged && (
        <p className="mt-3 rounded-md border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm leading-6 text-sky-100">
          {check.corrected}
        </p>
      )}
    </article>
  );
}
