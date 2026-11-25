'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { emptyField, type ScoreCard, type ScoreField } from '@/lib/scorecard/schema';

interface CardEditorProps {
  card: ScoreCard;
  onChange: (card: ScoreCard) => void;
}

const inputCls =
  'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const monoCls = `${inputCls} font-mono text-xs`;

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
      {children}
      {hint && <span className="font-normal text-gray-400"> · {hint}</span>}
    </span>
  );
}

function TextInput({
  label,
  value,
  onChange,
  hint,
  mono,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      <input className={mono ? monoCls : inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function NullableNumber({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <Label hint={hint}>{label}</Label>
      <input
        type="number"
        className={inputCls}
        value={value ?? ''}
        placeholder="none"
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      />
    </label>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 font-semibold text-gray-900 dark:text-white"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {title}
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3">{children}</div>}
    </section>
  );
}

const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

export function CardEditor({ card, onChange }: CardEditorProps) {
  const set = <K extends keyof ScoreCard>(key: K, value: ScoreCard[K]) => onChange({ ...card, [key]: value });
  const isRounds = card.layout === 'rounds';

  const setField = (index: number, patch: Partial<ScoreField>) =>
    set(
      'fields',
      card.fields.map((f, i) => (i === index ? { ...f, ...patch } : f))
    );
  const moveField = (index: number, dir: -1 | 1) => {
    const next = [...card.fields];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    set('fields', next);
  };
  const addField = () => {
    let n = card.fields.length + 1;
    while (card.fields.some((f) => f.id === `field${n}`)) n++;
    set('fields', [...card.fields, emptyField(`field${n}`)]);
  };

  const endOptions: Array<{ value: ScoreCard['end']['type']; label: string }> = isRounds
    ? [
        { value: 'fixed-rounds', label: 'After a fixed number of rounds' },
        { value: 'target-score', label: 'When someone reaches a target score' },
        { value: 'manual', label: 'When players decide' },
      ]
    : [
        { value: 'all-filled', label: 'When every row is filled in' },
        { value: 'manual', label: 'When players decide' },
      ];

  const contextNames = isRounds ? 'round, players, total, playerIndex' : 'players';

  return (
    <div className="space-y-4">
      <Section title="Basics">
        <TextInput label="Game name" value={card.name} onChange={(v) => set('name', v)} />
        <label className="block">
          <Label>Description</Label>
          <textarea className={inputCls} rows={2} value={card.description} onChange={(e) => set('description', e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <NullableNumber label="Min players" value={card.minPlayers} onChange={(v) => set('minPlayers', v ?? 1)} />
          <NullableNumber label="Max players" value={card.maxPlayers} onChange={(v) => set('maxPlayers', v ?? card.minPlayers)} />
          <Select
            label="Score kept per"
            value={card.playerLabel}
            options={[
              { value: 'player', label: 'Player' },
              { value: 'team', label: 'Team' },
            ]}
            onChange={(v) => set('playerLabel', v)}
          />
          <Select
            label="Winner"
            value={card.winner}
            options={[
              { value: 'highest', label: 'Highest total wins' },
              { value: 'lowest', label: 'Lowest total wins' },
            ]}
            onChange={(v) => set('winner', v)}
          />
          <Select
            label="Layout"
            value={card.layout}
            options={[
              { value: 'rounds', label: 'Rounds (score every round)' },
              { value: 'categories', label: 'Score sheet (fill rows once)' },
            ]}
            onChange={(v) =>
              onChange({
                ...card,
                layout: v,
                roundLabel: v === 'rounds' ? card.roundLabel ?? 'Round' : null,
                roundScore: v === 'rounds' ? card.roundScore ?? card.fields[0]?.id ?? '0' : null,
                end:
                  v === 'rounds'
                    ? { type: 'manual', rounds: null, roundsExpression: null, target: null }
                    : { type: 'all-filled', rounds: null, roundsExpression: null, target: null },
              })
            }
          />
          {isRounds && (
            <TextInput label="Round called" value={card.roundLabel ?? ''} onChange={(v) => set('roundLabel', v || null)} placeholder="Round" />
          )}
        </div>
      </Section>

      <Section title="End of game">
        <Select label="Game ends" value={card.end.type} options={endOptions} onChange={(v) => set('end', { ...card.end, type: v })} />
        {card.end.type === 'fixed-rounds' && (
          <div className="grid grid-cols-2 gap-3">
            <NullableNumber label="Number of rounds" value={card.end.rounds} onChange={(v) => set('end', { ...card.end, rounds: v })} />
            <TextInput
              label="Or rounds formula"
              hint="uses players"
              mono
              value={card.end.roundsExpression ?? ''}
              onChange={(v) => set('end', { ...card.end, roundsExpression: v || null })}
            />
          </div>
        )}
        {card.end.type === 'target-score' && (
          <NullableNumber label="Target score" value={card.end.target} onChange={(v) => set('end', { ...card.end, target: v })} />
        )}
      </Section>

      <Section title={isRounds ? `Inputs each ${(card.roundLabel || 'round').toLowerCase()}` : 'Score rows'}>
        {card.fields.map((f, i) => (
          <details key={i} className="rounded-md border border-gray-200 dark:border-gray-700 group" open={card.fields.length <= 3}>
            <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer list-none">
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm text-gray-900 dark:text-white">
                {f.label} <code className="text-xs text-gray-500">{f.id}</code>
              </span>
              <span className="text-xs text-gray-500">{f.type}</span>
              <button type="button" aria-label="Move up" onClick={(e) => (e.preventDefault(), moveField(i, -1))} className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                <ArrowUp className="w-4 h-4" />
              </button>
              <button type="button" aria-label="Move down" onClick={(e) => (e.preventDefault(), moveField(i, 1))} className="p-1 text-gray-500 hover:text-gray-900 dark:hover:text-white">
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label={`Remove ${f.label}`}
                onClick={(e) => (e.preventDefault(), set('fields', card.fields.filter((_, k) => k !== i)))}
                className="p-1 text-gray-500 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </summary>
            <div className="px-3 pb-3 grid grid-cols-2 gap-3">
              <TextInput label="Label" value={f.label} onChange={(v) => setField(i, { label: v })} />
              <TextInput label="Id" hint="used in formulas" mono value={f.id} onChange={(v) => setField(i, { id: v.trim() })} />
              <Select
                label="Type"
                value={f.type}
                options={[
                  { value: 'number', label: 'Number' },
                  { value: 'boolean', label: 'Checkbox' },
                  { value: 'select', label: 'Pick from list' },
                ]}
                onChange={(v) =>
                  setField(i, {
                    type: v,
                    options: v === 'select' ? f.options ?? [{ label: 'Option 1', value: 0 }] : null,
                  })
                }
              />
              {!isRounds && <TextInput label="Section" value={f.section ?? ''} onChange={(v) => setField(i, { section: v || null })} />}
              {f.type === 'number' && (
                <>
                  <NullableNumber label="Min" value={f.min} onChange={(v) => setField(i, { min: v })} />
                  <NullableNumber label="Max" value={f.max} onChange={(v) => setField(i, { max: v })} />
                  {isRounds && (
                    <TextInput
                      label="Max formula"
                      hint="round, players"
                      mono
                      value={f.maxExpression ?? ''}
                      onChange={(v) => setField(i, { maxExpression: v || null })}
                    />
                  )}
                  <NullableNumber label="Step" value={f.step} onChange={(v) => setField(i, { step: v })} />
                  <NullableNumber label="Default" value={f.defaultValue} onChange={(v) => setField(i, { defaultValue: v })} />
                </>
              )}
              {f.type === 'boolean' && !isRounds && (
                <NullableNumber label="Points when checked" value={f.points} onChange={(v) => setField(i, { points: v })} />
              )}
              {!isRounds && f.type !== 'boolean' && (
                <TextInput
                  label="Points formula"
                  hint="uses value; blank = value"
                  mono
                  value={f.scoreExpression ?? ''}
                  onChange={(v) => setField(i, { scoreExpression: v || null })}
                />
              )}
              <div className="col-span-2">
                <TextInput label="Help text" value={f.helpText ?? ''} onChange={(v) => setField(i, { helpText: v || null })} />
              </div>
              {f.type === 'select' && (
                <div className="col-span-2 space-y-2">
                  <Label>Options (label and value)</Label>
                  {(f.options ?? []).map((o, k) => (
                    <div key={k} className="flex gap-2">
                      <input
                        className={inputCls}
                        value={o.label}
                        aria-label="Option label"
                        onChange={(e) =>
                          setField(i, { options: (f.options ?? []).map((x, j) => (j === k ? { ...x, label: e.target.value } : x)) })
                        }
                      />
                      <input
                        type="number"
                        className={`${inputCls} w-24`}
                        value={o.value}
                        aria-label="Option value"
                        onChange={(e) =>
                          setField(i, {
                            options: (f.options ?? []).map((x, j) => (j === k ? { ...x, value: Number(e.target.value) } : x)),
                          })
                        }
                      />
                      <button
                        type="button"
                        aria-label="Remove option"
                        className="p-1 text-gray-500 hover:text-red-600"
                        onClick={() => setField(i, { options: (f.options ?? []).filter((_, j) => j !== k) })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setField(i, { options: [...(f.options ?? []), { label: `Option ${(f.options?.length ?? 0) + 1}`, value: 0 }] })}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add option
                  </Button>
                </div>
              )}
            </div>
          </details>
        ))}
        <Button variant="secondary" size="sm" onClick={addField}>
          <Plus className="w-4 h-4 mr-1" /> Add {isRounds ? 'input' : 'row'}
        </Button>
      </Section>

      {isRounds ? (
        <Section title="Scoring formula">
          <label className="block">
            <Label hint={`one player's points for the round; names: field ids, ${contextNames}`}>Round score</Label>
            <textarea className={monoCls} rows={3} value={card.roundScore ?? ''} onChange={(e) => set('roundScore', e.target.value || null)} />
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Operators: + - * / % == != &lt; &gt; &amp;&amp; || and cond ? a : b. Functions: abs, min, max, floor, ceil, round,
            clamp, if, and across players: sumAll(field), maxAll, minAll, countAll, rankOf.
          </p>
          <Label>Round checks</Label>
          {card.roundChecks.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
              <input
                className={monoCls}
                aria-label="Check formula"
                value={c.expression}
                onChange={(e) => set('roundChecks', card.roundChecks.map((x, k) => (k === i ? { ...x, expression: e.target.value } : x)))}
              />
              <input
                className={inputCls}
                aria-label="Check message"
                value={c.message}
                onChange={(e) => set('roundChecks', card.roundChecks.map((x, k) => (k === i ? { ...x, message: e.target.value } : x)))}
              />
              <select
                className={inputCls}
                aria-label="Check severity"
                value={c.severity}
                onChange={(e) =>
                  set('roundChecks', card.roundChecks.map((x, k) => (k === i ? { ...x, severity: e.target.value as 'error' | 'warning' } : x)))
                }
              >
                <option value="error">Blocks</option>
                <option value="warning">Warns</option>
              </select>
              <button type="button" aria-label="Remove check" className="p-1 text-gray-500 hover:text-red-600" onClick={() => set('roundChecks', card.roundChecks.filter((_, k) => k !== i))}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => set('roundChecks', [...card.roundChecks, { expression: '', message: '', severity: 'warning' }])}
          >
            <Plus className="w-4 h-4 mr-1" /> Add check
          </Button>
        </Section>
      ) : (
        <Section title="Bonus rows">
          {card.bonuses.map((b, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-md border border-gray-200 dark:border-gray-700 p-2">
              <TextInput label="Label" value={b.label} onChange={(v) => set('bonuses', card.bonuses.map((x, k) => (k === i ? { ...x, label: v } : x)))} />
              <TextInput label="Id" mono value={b.id} onChange={(v) => set('bonuses', card.bonuses.map((x, k) => (k === i ? { ...x, id: v.trim() } : x)))} />
              <div className="col-span-2 flex gap-2 items-end">
                <div className="flex-1">
                  <TextInput
                    label="Formula"
                    hint="uses row ids"
                    mono
                    value={b.expression}
                    onChange={(v) => set('bonuses', card.bonuses.map((x, k) => (k === i ? { ...x, expression: v } : x)))}
                  />
                </div>
                <button type="button" aria-label="Remove bonus" className="p-2 text-gray-500 hover:text-red-600" onClick={() => set('bonuses', card.bonuses.filter((_, k) => k !== i))}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => set('bonuses', [...card.bonuses, { id: `bonus${card.bonuses.length + 1}`, label: 'Bonus', expression: '0', helpText: null }])}
          >
            <Plus className="w-4 h-4 mr-1" /> Add bonus row
          </Button>
        </Section>
      )}

      <Section title="Rules summary" defaultOpen={false}>
        <label className="block">
          <Label>Overview</Label>
          <textarea className={inputCls} rows={3} value={card.rules.overview} onChange={(e) => set('rules', { ...card.rules, overview: e.target.value })} />
        </label>
        <label className="block">
          <Label hint="one per line">Scoring rules</Label>
          <textarea
            className={inputCls}
            rows={4}
            defaultValue={card.rules.scoring.join('\n')}
            onBlur={(e) => set('rules', { ...card.rules, scoring: lines(e.target.value) })}
          />
        </label>
        <TextInput label="How to win" value={card.rules.winning} onChange={(v) => set('rules', { ...card.rules, winning: v })} />
        <label className="block">
          <Label hint="one per line">Interpretations / assumptions</Label>
          <textarea
            className={inputCls}
            rows={3}
            defaultValue={card.rules.assumptions.join('\n')}
            onBlur={(e) => set('rules', { ...card.rules, assumptions: lines(e.target.value) })}
          />
        </label>
      </Section>
    </div>
  );
}
