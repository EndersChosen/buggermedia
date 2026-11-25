'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Send,
  Share2,
  Sparkles,
  Type,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ScoreCard } from '@/lib/scorecard/schema';
import { validateScoreCard } from '@/lib/scorecard/validate';
import { emptyPlayerValues, type PlayerRef } from '@/lib/scorecard/engine';
import { MAX_LOCAL_PDF_BYTES, MAX_RULES_CHARS, MAX_UPLOAD_BYTES } from '@/lib/scorecard/limits';
import { useCustomCards, getCustomCard } from '@/hooks/useCustomCards';
import { CardEditor } from '@/features/scorecard/CardEditor';
import { ScoreCardPlay, type ScoreCardState } from '@/features/scorecard/ScoreCardPlay';
import { RulesPanel } from '@/features/scorecard/RulesPanel';
import { blankCard } from './blankCard';

type Step = 'input' | 'generating' | 'review';
type InputMethod = 'text' | 'file';

interface ModelInfo {
  id: string;
  label: string;
  description: string;
  available: boolean;
}

interface GenerateResponse {
  card: ScoreCard;
  warnings: string[];
  attempts: number;
  model: string;
  servedBy?: string;
}

const ACCEPT = '.pdf,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,text/markdown,image/*';

const STAGES = [
  { after: 0, text: 'Reading the rules…' },
  { after: 8, text: 'Working out how the game is scored…' },
  { after: 25, text: 'Designing the score card…' },
  { after: 50, text: 'Checking the scoring formulas…' },
  { after: 90, text: 'Still working: long rule books take a couple of minutes…' },
];

function formatBytes(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;
}

export function CreateScoreCardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get('edit');
  const { saveCard } = useCustomCards();

  const initial = useMemo(() => {
    if (editSlug) {
      const existing = getCustomCard(editSlug);
      if (existing) return { card: existing.card, rulesText: existing.rulesText ?? '' };
    }
    if (searchParams.get('blank')) return { card: blankCard(), rulesText: '' };
    return null;
  }, [editSlug, searchParams]);

  const [step, setStep] = useState<Step>(initial ? 'review' : 'input');
  const [method, setMethod] = useState<InputMethod>('text');
  const [gameName, setGameName] = useState('');
  const [rulesText, setRulesText] = useState(initial?.rulesText ?? '');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState<string>('');
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [stageNote, setStageNote] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [card, setCard] = useState<ScoreCard | null>(initial?.card ?? null);
  const [genInfo, setGenInfo] = useState<{ warnings: string[]; attempts: number; model: string } | null>(null);
  const [view, setView] = useState<'preview' | 'edit'>('preview');
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);
  const [published, setPublished] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Load available models.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/scorecards/models')
      .then((r) => r.json())
      .then((data: { models: ModelInfo[]; defaultModel: string | null }) => {
        if (cancelled) return;
        setModels(data.models);
        setModel((m) => m || data.defaultModel || '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Elapsed timer while generating.
  useEffect(() => {
    if (step !== 'generating' && !refining) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => {
      clearInterval(id);
      setElapsed(0);
    };
  }, [step, refining]);

  const validation = useMemo(() => (card ? validateScoreCard(card) : null), [card]);
  const anyModelAvailable = models.some((m) => m.available);

  const callGenerate = useCallback(async (body: FormData | object): Promise<GenerateResponse> => {
    const controller = new AbortController();
    abortRef.current = controller;
    const isForm = body instanceof FormData;
    const res = await fetch('/api/scorecards/generate', {
      method: 'POST',
      body: isForm ? body : JSON.stringify(body),
      headers: isForm ? undefined : { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.card) {
      const err = new Error(data?.error || `The server returned an error (${res.status}).`) as Error & { details?: string[] };
      err.details = data?.details;
      throw err;
    }
    return data as GenerateResponse;
  }, []);

  const handleGenerate = async () => {
    setError(null);
    setStageNote(null);
    setStep('generating');
    try {
      let body: FormData | object;
      let sourceText = rulesText.trim();

      if (method === 'file') {
        if (!file) throw new Error('Choose a rule book file first.');
        const isText = /\.(txt|md|markdown)$/i.test(file.name) || file.type.startsWith('text/');
        const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        if (isText) {
          sourceText = (await file.text()).trim();
          body = { mode: 'create', gameName, rulesText: sourceText, notes, model };
        } else if (isPdf && file.size > MAX_UPLOAD_BYTES) {
          if (file.size > MAX_LOCAL_PDF_BYTES) throw new Error(`That PDF is over ${formatBytes(MAX_LOCAL_PDF_BYTES)}. Try a smaller file.`);
          const { extractPdfText } = await import('./pdfText');
          setStageNote('Large PDF: reading its text in your browser…');
          sourceText = await extractPdfText(file, (p, t) => setStageNote(`Large PDF: reading page ${p} of ${t} in your browser…`));
          setStageNote(null);
          if (sourceText.replace(/--- Page \d+ ---/g, '').trim().length < 200) {
            throw new Error(
              'This PDF looks scanned (it has almost no selectable text) and is too big to upload. Upload photos or a smaller PDF of the scoring pages, or paste the scoring rules as text.'
            );
          }
          if (sourceText.length > MAX_RULES_CHARS) sourceText = sourceText.slice(0, MAX_RULES_CHARS);
          body = { mode: 'create', gameName, rulesText: sourceText, notes, model };
        } else {
          if (file.size > MAX_UPLOAD_BYTES) throw new Error(`Images must be under ${formatBytes(MAX_UPLOAD_BYTES)}.`);
          const form = new FormData();
          form.append('file', file);
          form.append('gameName', gameName);
          form.append('notes', notes);
          form.append('model', model);
          body = form;
          sourceText = '';
        }
      } else {
        body = { mode: 'create', gameName, rulesText: sourceText, notes, model };
      }

      const result = await callGenerate(body);
      if (sourceText) setRulesText(sourceText);
      setCard(result.card);
      setGenInfo({ warnings: result.warnings, attempts: result.attempts, model: result.servedBy ?? result.model });
      setPublished(null);
      setView('preview');
      setStep('review');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setStep('input');
        return;
      }
      setError({
        message: e instanceof Error ? e.message : 'Something went wrong.',
        details: (e as { details?: string[] }).details,
      });
      setStep('input');
    }
  };

  const handleRefine = async () => {
    if (!card || refineText.trim().length < 3) return;
    setRefining(true);
    setError(null);
    try {
      const result = await callGenerate({
        mode: 'refine',
        card,
        instruction: refineText.trim(),
        rulesText: rulesText ? rulesText.slice(0, MAX_RULES_CHARS) : undefined,
        model,
      });
      setCard(result.card);
      setGenInfo({ warnings: result.warnings, attempts: result.attempts, model: result.servedBy ?? result.model });
      setRefineText('');
      setNotice('Updated the score card.');
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setError({ message: e instanceof Error ? e.message : 'Could not update the card.', details: (e as { details?: string[] }).details });
      }
    } finally {
      setRefining(false);
    }
  };

  const persist = () => {
    if (!validation?.ok || !validation.card) return null;
    return saveCard(validation.card, { slug: editSlug && getCustomCard(editSlug) ? editSlug : undefined, rulesText: rulesText || null, publishedSlug: published });
  };

  const handleSaveAndPlay = () => {
    const entry = persist();
    if (entry) router.push(`/?play=${encodeURIComponent(entry.slug)}`);
  };

  const handleSave = () => {
    const entry = persist();
    if (entry) router.push('/');
  };

  const handlePublish = async () => {
    if (!validation?.ok || !validation.card) return;
    if (!confirm('Publish this score card to the shared library? Anyone using the site will be able to see and play it.')) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card: validation.card }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw Object.assign(new Error(data?.error || 'Publishing failed.'), { details: data?.details });
      setPublished(data.gameSlug);
      setNotice('Published to the shared library.');
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : 'Publishing failed.', details: (e as { details?: string[] }).details });
    } finally {
      setPublishing(false);
    }
  };

  const onPickFile = (f: File | null | undefined) => {
    setError(null);
    if (!f) return;
    // Leave the game name alone: the AI reads the proper name from the rule book,
    // and a name typed here overrides it.
    setFile(f);
  };

  const canGenerate =
    anyModelAvailable &&
    Boolean(model) &&
    (method === 'text' ? rulesText.trim().length >= 20 || (gameName.trim().length > 0 && rulesText.trim().length > 0) : Boolean(file));

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Button variant="secondary" size="sm" onClick={() => router.push('/')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to games
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {step === 'review' ? (editSlug ? 'Edit score card' : 'Review your score card') : 'Create a score card'}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {step === 'review'
            ? 'Try it with sample players, fix anything that looks off, then save it.'
            : 'Describe a game or upload its rule book, and AI will build a score card that adds everything up for you.'}
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-red-800 dark:text-red-200">{error.message}</p>
              {error.details && error.details.length > 0 && (
                <details className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <summary className="cursor-pointer">Details</summary>
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    {error.details.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => setError(null)} className="text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 'input' && (
        <div className="space-y-6">
          <div className="border-b border-gray-200 dark:border-gray-700 flex gap-4" role="tablist">
            {(
              [
                ['text', 'Describe or paste rules', Type],
                ['file', 'Upload rule book', FileText],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={method === key}
                onClick={() => setMethod(key)}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  method === key
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 inline mr-2" />
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Game name</span>
              <input
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="e.g. Hearts, Yahtzee, Ticket to Ride"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </label>

            {method === 'text' ? (
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">How is the game scored?</span>
                <textarea
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  rows={12}
                  placeholder={
                    'Describe it in your own words or paste the rules. For example:\n\n"Each hand, players take penalty points: 1 per heart and 13 for the queen of spades. If one player takes all 26, everyone else gets 26 instead. The game ends when someone reaches 100; lowest score wins."'
                  }
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm resize-y"
                />
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  {rulesText.length.toLocaleString()} characters · a short description of the scoring is enough for well-known games
                </span>
              </label>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onPickFile(e.dataTransfer.files?.[0]);
                }}
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  dragOver ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                {file ? (
                  <div className="space-y-2">
                    <p className="font-medium text-gray-900 dark:text-white break-all">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatBytes(file.size)}</p>
                    <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                      Choose a different file
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">Drop a rule book here, or</p>
                    <label className="inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                      Choose file
                      <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => onPickFile(e.target.files?.[0])} />
                    </label>
                  </>
                )}
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  PDF, text or Markdown, or a photo of the scoring rules. PDFs over 4 MB are read in your browser (text only).
                </p>
              </div>
            )}

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                House rules or variant <span className="font-normal text-gray-400">(optional)</span>
              </span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. we play to 50 instead of 100"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI model</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id} disabled={!m.available}>
                    {m.label}
                    {m.available ? '' : ' (not configured)'}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                {models.find((m) => m.id === model)?.description}
              </span>
            </label>

            {models.length > 0 && !anyModelAvailable && (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                AI generation isn&apos;t configured on this server. You can still build a card by hand.
              </p>
            )}

            <div className="flex flex-wrap gap-3 justify-between items-center">
              <Button variant="ghost" onClick={() => {
                setCard(blankCard(gameName || undefined));
                setGenInfo(null);
                setView('edit');
                setStep('review');
              }}>
                <Pencil className="w-4 h-4 mr-2" /> Build it by hand instead
              </Button>
              <Button size="lg" onClick={handleGenerate} disabled={!canGenerate}>
                <Sparkles className="w-5 h-5 mr-2" /> Generate score card
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center space-y-4" aria-live="polite">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-lg font-medium text-gray-900 dark:text-white">
            {stageNote ?? [...STAGES].reverse().find((s) => elapsed >= s.after)?.text}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">{elapsed}s elapsed · usually under 90 seconds</p>
          <Button variant="secondary" onClick={() => abortRef.current?.abort()}>
            Cancel
          </Button>
        </div>
      )}

      {step === 'review' && card && (
        <ReviewStep
          card={card}
          setCard={setCard}
          validation={validation}
          genInfo={genInfo}
          view={view}
          setView={setView}
          refineText={refineText}
          setRefineText={setRefineText}
          refining={refining}
          elapsed={elapsed}
          canRefine={anyModelAvailable}
          onRefine={handleRefine}
          onCancelRefine={() => abortRef.current?.abort()}
          onSaveAndPlay={handleSaveAndPlay}
          onSave={handleSave}
          onPublish={handlePublish}
          publishing={publishing}
          published={published}
          notice={notice}
          clearNotice={() => setNotice(null)}
          onStartOver={() => {
            if (confirm('Discard this score card and start over?')) {
              setCard(null);
              setStep('input');
            }
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review step
// ---------------------------------------------------------------------------

interface ReviewStepProps {
  card: ScoreCard;
  setCard: (card: ScoreCard) => void;
  validation: ReturnType<typeof validateScoreCard> | null;
  genInfo: { warnings: string[]; attempts: number; model: string } | null;
  view: 'preview' | 'edit';
  setView: (v: 'preview' | 'edit') => void;
  refineText: string;
  setRefineText: (v: string) => void;
  refining: boolean;
  elapsed: number;
  canRefine: boolean;
  onRefine: () => void;
  onCancelRefine: () => void;
  onSaveAndPlay: () => void;
  onSave: () => void;
  onPublish: () => void;
  publishing: boolean;
  published: string | null;
  notice: string | null;
  clearNotice: () => void;
  onStartOver: () => void;
}

function ReviewStep(props: ReviewStepProps) {
  const { card, validation } = props;
  const ok = Boolean(validation?.ok);

  return (
    <div className="space-y-4">
      {props.notice && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 px-3 py-2 text-sm">
          <CheckCircle2 className="w-4 h-4" /> {props.notice}
          <button type="button" className="ml-auto" aria-label="Dismiss" onClick={props.clearNotice}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col md:flex-row md:items-center gap-3 justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{card.name || 'Untitled game'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {card.layout === 'rounds' ? 'Scored every ' + (card.roundLabel || 'round').toLowerCase() : 'Score sheet'} ·{' '}
            {card.minPlayers === card.maxPlayers ? card.minPlayers : `${card.minPlayers}–${card.maxPlayers}`}{' '}
            {card.playerLabel === 'team' ? 'teams' : 'players'} · {card.winner} total wins
            {props.genInfo && (
              <>
                {' '}· made by {props.genInfo.model}
                {props.genInfo.attempts > 1 ? ` (fixed after ${props.genInfo.attempts - 1} retry)` : ''}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={props.onSaveAndPlay} disabled={!ok}>
            Save &amp; play
          </Button>
          <Button variant="secondary" onClick={props.onSave} disabled={!ok}>
            Save to my games
          </Button>
          <Button variant="secondary" onClick={props.onPublish} disabled={!ok || props.publishing || Boolean(props.published)}>
            {props.publishing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
            {props.published ? 'Published' : 'Publish'}
          </Button>
          <Button variant="ghost" onClick={props.onStartOver}>
            Start over
          </Button>
        </div>
      </div>

      {validation && validation.errors.length > 0 && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm">
          <p className="font-medium text-red-800 dark:text-red-200 mb-1">Fix these before saving:</p>
          <ul className="list-disc pl-5 space-y-0.5 text-red-700 dark:text-red-300">
            {validation.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {card.rules.assumptions.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Check these interpretations
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-amber-900 dark:text-amber-100">
            {card.rules.assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {props.canRefine && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="refine">
            Ask the AI to change something
          </label>
          <div className="flex gap-2">
            <input
              id="refine"
              value={props.refineText}
              onChange={(e) => props.setRefineText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !props.refining) props.onRefine();
              }}
              placeholder='e.g. "Add a 50-point bonus for going out first" or "Play to 500 instead"'
              disabled={props.refining}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
            />
            {props.refining ? (
              <Button variant="secondary" onClick={props.onCancelRefine}>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {props.elapsed}s · Cancel
              </Button>
            ) : (
              <Button onClick={props.onRefine} disabled={props.refineText.trim().length < 3}>
                <Send className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Update</span>
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 lg:hidden" role="tablist">
        {(['preview', 'edit'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={props.view === v}
            onClick={() => props.setView(v)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
              props.view === v ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
            }`}
          >
            {v === 'preview' ? 'Try it' : 'Edit'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className={props.view === 'edit' ? '' : 'hidden lg:block'}>
          <CardEditor card={card} onChange={props.setCard} />
        </div>
        <div className={`space-y-4 ${props.view === 'preview' ? '' : 'hidden lg:block'}`}>
          <PreviewPane card={validation?.card ?? card} valid={ok} />
          <RulesPanel card={card} defaultOpen />
        </div>
      </div>
    </div>
  );
}

function PreviewPane({ card, valid }: { card: ScoreCard; valid: boolean }) {
  const count = Math.max(1, Math.min(card.maxPlayers, Math.max(card.minPlayers, 3)));
  const players: PlayerRef[] = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `sample-${i + 1}`,
        name: `${card.playerLabel === 'team' ? 'Team' : 'Player'} ${i + 1}`,
      })),
    [count, card.playerLabel]
  );
  const [state, setState] = useState<ScoreCardState>(() => ({ rounds: [], sheet: emptyPlayerValues(card, players), draft: null }));
  const [stateKey, setStateKey] = useState(players.length);

  // Reset the sample game when the number of sample players changes.
  if (stateKey !== players.length) {
    setStateKey(players.length);
    setState({ rounds: [], sheet: emptyPlayerValues(card, players), draft: null });
  }

  return (
    <section className="rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-800 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">Try it with sample {card.playerLabel === 'team' ? 'teams' : 'players'}</h3>
        <Button variant="ghost" size="sm" onClick={() => setState({ rounds: [], sheet: emptyPlayerValues(card, players), draft: null })}>
          Reset
        </Button>
      </div>
      {valid ? (
        <ScoreCardPlay card={card} players={players} state={state} onChange={(patch) => setState((s) => ({ ...s, ...patch }))} />
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Fix the problems listed above to try the card.</p>
      )}
    </section>
  );
}
