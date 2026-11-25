'use client';

import { Fragment, useMemo } from 'react';
import { Trophy, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ScoreCard } from '@/lib/scorecard/schema';
import {
  filledCount,
  isCategoriesComplete,
  leaders,
  summarizeCategories,
  type PlayerRef,
  type PlayerValues,
} from '@/lib/scorecard/engine';
import { FieldInput } from './FieldInput';

export interface CategoriesCardProps {
  card: ScoreCard;
  players: PlayerRef[];
  sheet: PlayerValues;
  onChange: (patch: { sheet: PlayerValues }) => void;
  onFinish?: () => void;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ''));

export function CategoriesCard({ card, players, sheet, onChange, onFinish }: CategoriesCardProps) {
  const summary = useMemo(() => summarizeCategories(card, players, sheet), [card, players, sheet]);
  const complete = isCategoriesComplete(card, players, sheet);
  const winners = leaders(card, players, summary.totals);
  const errors = summary.issues.filter((i) => i.severity === 'error');

  const setValue = (playerId: string, fieldId: string, value: number | null) => {
    onChange({ sheet: { ...sheet, [playerId]: { ...sheet[playerId], [fieldId]: value } } });
  };

  // Preserve field order but emit a heading whenever the section changes.
  const rows = card.fields.map((f, i) => ({
    field: f,
    heading: f.section && f.section !== card.fields[i - 1]?.section ? f.section : null,
  }));

  return (
    <div className="space-y-4">
      {complete && (
        <section className="rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-green-600" />
            <p className="font-bold text-lg text-gray-900 dark:text-white">
              {winners.length > 1 ? 'Tie: ' : 'Winner: '}
              {winners.map((w) => w.name).join(' & ')}
            </p>
          </div>
          {onFinish && (
            <Button size="sm" onClick={onFinish}>
              Finish game
            </Button>
          )}
        </section>
      )}

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300">
              <th className="px-3 py-2 text-left font-medium sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 min-w-[7.5rem] sm:min-w-[9rem]">
                Category
              </th>
              {players.map((p) => (
                <th key={p.id} className="px-2 py-2 text-center font-medium min-w-[4.5rem] sm:min-w-[8.5rem]">
                  <span className="block truncate">{p.name}</span>
                  <span className="block text-xs font-normal text-gray-500">
                    {filledCount(card, sheet[p.id])}/{card.fields.length}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ field: f, heading }) => (
              <Fragment key={f.id}>
                {heading && (
                  <tr className="bg-gray-100 dark:bg-gray-900/60">
                    <td
                      colSpan={players.length + 1}
                      className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 sticky left-0"
                    >
                      {heading}
                    </td>
                  </tr>
                )}
                <tr className="border-t border-gray-100 dark:border-gray-700 align-top">
                  <th
                    scope="row"
                    className="px-3 py-2 text-left font-normal text-gray-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-gray-800"
                  >
                    {f.label}
                    {f.helpText && <span className="block text-xs text-gray-500 dark:text-gray-400">{f.helpText}</span>}
                  </th>
                  {players.map((p) => {
                    const invalid = summary.issues.some((i) => i.playerId === p.id && i.fieldId === f.id);
                    const pts = summary.rowScores[p.id]?.[f.id] ?? 0;
                    const showPts = f.type !== 'number' || f.scoreExpression;
                    return (
                      <td key={p.id} className="px-2 py-1.5">
                        <div className={f.type === 'boolean' ? 'flex justify-center' : ''}>
                          <FieldInput
                            field={f}
                            value={sheet[p.id]?.[f.id]}
                            max={f.max}
                            invalid={invalid}
                            compact
                            ariaLabel={`${p.name} – ${f.label}`}
                            onChange={(v) => setValue(p.id, f.id, v)}
                          />
                        </div>
                        {showPts && (
                          <span className="block text-center text-xs text-gray-500 dark:text-gray-400 tabular-nums mt-0.5">
                            {fmt(pts)} pts
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            ))}
            {card.bonuses.map((b) => (
              <tr key={b.id} className="border-t border-gray-100 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/10">
                <th
                  scope="row"
                  className="px-3 py-2 text-left font-medium text-gray-900 dark:text-white sticky left-0 z-10 bg-blue-50 dark:bg-gray-800"
                >
                  {b.label}
                  {b.helpText && <span className="block text-xs font-normal text-gray-500">{b.helpText}</span>}
                </th>
                {players.map((p) => (
                  <td key={p.id} className="px-2 py-2 text-center tabular-nums text-gray-900 dark:text-white">
                    {fmt(summary.rowScores[p.id]?.[b.id] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 dark:border-gray-600">
              <th scope="row" className="px-3 py-3 text-left font-bold text-gray-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-gray-800">
                Total
              </th>
              {players.map((p) => {
                const isLeader = winners.some((w) => w.id === p.id) && summary.totals[p.id] !== 0;
                return (
                  <td
                    key={p.id}
                    className={`px-2 py-3 text-center text-lg font-bold tabular-nums ${
                      isLeader ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'
                    }`}
                    data-testid={`total-${p.id}`}
                  >
                    {fmt(summary.totals[p.id] ?? 0)}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {errors.length > 0 && (
        <ul className="space-y-1 text-sm" aria-live="polite">
          {errors.map((i, k) => (
            <li key={k} className="flex items-start gap-2 text-red-700 dark:text-red-400">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> {i.message}
            </li>
          ))}
        </ul>
      )}

      {!complete && onFinish && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={onFinish}>
            Finish game early
          </Button>
        </div>
      )}
    </div>
  );
}
