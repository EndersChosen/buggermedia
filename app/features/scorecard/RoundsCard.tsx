'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Pencil, RotateCcw, Trophy, Undo2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ScoreCard } from '@/lib/scorecard/schema';
import {
  emptyPlayerValues,
  fieldMaximum,
  isRoundsGameOver,
  leaders,
  resolveRoundCount,
  scoreRound,
  standings,
  summarizeRounds,
  type PlayerRef,
  type PlayerValues,
  type RoundEntry,
} from '@/lib/scorecard/engine';
import { FieldInput } from './FieldInput';
import { Celebration } from '@/components/theme/ThemeShell';
import { themeForCard } from '@/lib/themes';

export interface RoundsCardProps {
  card: ScoreCard;
  players: PlayerRef[];
  rounds: RoundEntry[];
  draft: PlayerValues | null;
  onChange: (patch: { rounds?: RoundEntry[]; draft?: PlayerValues | null }) => void;
  onFinish?: () => void;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''));

export function RoundsCard({ card, players, rounds, draft, onChange, onFinish }: RoundsCardProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<PlayerValues | null>(null);

  const summary = useMemo(() => summarizeRounds(card, players, rounds), [card, players, rounds]);
  const totalRounds = resolveRoundCount(card, players.length);
  const gameOver = isRoundsGameOver(card, players, rounds, summary.totals);
  const ranking = standings(card, players, summary.totals);
  const winners = leaders(card, players, summary.totals);
  const roundLabel = card.roundLabel || 'Round';
  const unit = card.playerLabel === 'team' ? 'Team' : 'Player';

  const isEditing = editingIndex !== null;
  const entryRoundNumber = isEditing ? editingIndex + 1 : rounds.length + 1;
  const values: PlayerValues = (isEditing ? editValues : draft) ?? emptyPlayerValues(card, players);
  const totalsBefore = isEditing ? summary.runningTotals[editingIndex - 1] ?? {} : summary.totals;
  const preview = scoreRound(card, players, { values }, entryRoundNumber, totalsBefore);
  const errors = preview.issues.filter((i) => i.severity === 'error');
  const warnings = preview.issues.filter((i) => i.severity === 'warning');
  const showEntry = isEditing || !gameOver;

  const setValue = (playerId: string, fieldId: string, value: number | null) => {
    const next: PlayerValues = {
      ...values,
      [playerId]: { ...values[playerId], [fieldId]: value },
    };
    if (isEditing) setEditValues(next);
    else onChange({ draft: next });
  };

  const saveRound = () => {
    if (errors.length) return;
    const entry: RoundEntry = { values: structuredClone(values) };
    if (isEditing) {
      onChange({ rounds: rounds.map((r, i) => (i === editingIndex ? entry : r)) });
      setEditingIndex(null);
      setEditValues(null);
    } else {
      onChange({ rounds: [...rounds, entry], draft: null });
    }
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValues(structuredClone(rounds[index].values));
  };

  const undoLast = () => {
    if (rounds.length === 0) return;
    if (!confirm(`Remove ${roundLabel.toLowerCase()} ${rounds.length}?`)) return;
    onChange({ rounds: rounds.slice(0, -1) });
  };

  const progress = totalRounds
    ? `${roundLabel} ${Math.min(rounds.length + 1, totalRounds)} of ${totalRounds}`
    : card.end.type === 'target-score' && card.end.target !== null
      ? `${roundLabel} ${rounds.length + 1} · game ends at ${fmt(card.end.target)}`
      : `${roundLabel} ${rounds.length + 1}`;

  return (
    <div className="space-y-6">
      {/* Standings */}
      <section aria-label="Standings" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {ranking.map((s) => (
          <div
            key={s.player.id}
            className={`rounded-lg px-3 py-2 border ${
              s.rank === 1 && rounds.length > 0
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1 text-xs text-gray-500 dark:text-gray-400">
              <span>#{s.rank}</span>
              {s.rank === 1 && rounds.length > 0 && <Trophy className="w-3.5 h-3.5 text-amber-500" />}
            </div>
            <div className="truncate font-medium text-gray-900 dark:text-white" title={s.player.name}>
              {s.player.name}
            </div>
            <div className="text-2xl font-bold tabular-nums text-gray-900 dark:text-white theme-heading" data-testid={`total-${s.player.id}`}>
              <span key={s.total} className="anim-pop">
                {fmt(s.total)}
              </span>
            </div>
          </div>
        ))}
      </section>

      {gameOver && !isEditing && (
        <section className="relative anim-rise anim-glow rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <Celebration theme={themeForCard(card)} />
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-green-600" />
            <div>
              <p className="font-bold text-lg text-gray-900 dark:text-white">
                {winners.length > 1 ? 'Tie: ' : 'Winner: '}
                {winners.map((w) => w.name).join(' & ')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Game over after {rounds.length} {roundLabel.toLowerCase()}
                {rounds.length === 1 ? '' : 's'} ({card.winner === 'lowest' ? 'lowest' : 'highest'} total wins).
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={undoLast}>
              <Undo2 className="w-4 h-4 mr-1" /> Undo last
            </Button>
            {onFinish && (
              <Button size="sm" onClick={onFinish}>
                Finish game
              </Button>
            )}
          </div>
        </section>
      )}

      {/* Entry */}
      {showEntry && (
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isEditing ? `Editing ${roundLabel.toLowerCase()} ${entryRoundNumber}` : progress}
            </h3>
            {!isEditing && card.end.type === 'manual' && rounds.length > 0 && onFinish && (
              <Button variant="secondary" size="sm" onClick={onFinish}>
                End game now
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p) => (
              <div key={p.id} className="anim-rise rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-white truncate">{p.name}</span>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      (preview.scores[p.id] ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'
                    }`}
                    data-testid={`round-score-${p.id}`}
                  >
                    {(preview.scores[p.id] ?? 0) > 0 ? '+' : ''}
                    {fmt(preview.scores[p.id] ?? 0)}
                  </span>
                </div>
                {card.fields.map((f) => {
                  const invalid = preview.issues.some((i) => i.playerId === p.id && i.fieldId === f.id);
                  return (
                    <div key={f.id} className={f.type === 'boolean' ? 'flex items-center justify-between gap-2' : ''}>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-0.5" title={f.helpText ?? undefined}>
                        {f.label}
                      </label>
                      <FieldInput
                        field={f}
                        value={values[p.id]?.[f.id]}
                        max={fieldMaximum(f, { round: entryRoundNumber, players: players.length })}
                        invalid={invalid}
                        ariaLabel={`${p.name} – ${f.label}`}
                        onChange={(v) => setValue(p.id, f.id, v)}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {(errors.length > 0 || warnings.length > 0) && (
            <ul className="space-y-1 text-sm" aria-live="polite">
              {errors.map((i, k) => (
                <li key={`e${k}`} className="flex items-start gap-2 text-red-700 dark:text-red-400">
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> {i.message}
                </li>
              ))}
              {warnings.map((i, k) => (
                <li key={`w${k}`} className="flex items-start gap-2 text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {i.message}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={saveRound} disabled={errors.length > 0}>
              {isEditing ? 'Save changes' : `Save ${roundLabel.toLowerCase()} ${entryRoundNumber}`}
            </Button>
            {isEditing ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingIndex(null);
                  setEditValues(null);
                }}
              >
                Cancel
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => onChange({ draft: null })}>
                <RotateCcw className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
          {card.fields.some((f) => f.helpText) && (
            <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
              {card.fields
                .filter((f) => f.helpText)
                .map((f) => (
                  <li key={f.id}>
                    <span className="font-medium">{f.label}:</span> {f.helpText}
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}

      {/* History */}
      {rounds.length > 0 && (
        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300">
                <th className="px-3 py-2 text-left font-medium sticky left-0 bg-gray-50 dark:bg-gray-900">{roundLabel}</th>
                {players.map((p) => (
                  <th key={p.id} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                    {p.name}
                  </th>
                ))}
                <th className="px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rounds.map((_, i) => (
                <tr key={i} className={`anim-rise border-t border-gray-100 dark:border-gray-700 ${editingIndex === i ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <td className="px-3 py-2 sticky left-0 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">{i + 1}</td>
                  {players.map((p) => (
                    <td key={p.id} className="px-3 py-2 text-right tabular-nums">
                      <span className="text-gray-900 dark:text-white">{fmt(summary.roundScores[i][p.id] ?? 0)}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{fmt(summary.runningTotals[i][p.id] ?? 0)}</span>
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(i)}
                      aria-label={`Edit ${roundLabel.toLowerCase()} ${i + 1}`}
                      className="p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
                <td className="px-3 py-2 sticky left-0 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Total</td>
                {players.map((p) => (
                  <td key={p.id} className="px-3 py-2 text-right tabular-nums text-gray-900 dark:text-white">
                    {fmt(summary.totals[p.id] ?? 0)}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
          {!gameOver && (
            <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700">
              <Button variant="ghost" size="sm" onClick={undoLast}>
                <Undo2 className="w-4 h-4 mr-1" /> Undo last {roundLabel.toLowerCase()}
              </Button>
            </div>
          )}
        </section>
      )}
      <p className="sr-only">{unit} scores update as you type.</p>
    </div>
  );
}
