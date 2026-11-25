'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import type { ScoreCard } from '@/lib/scorecard/schema';

export function RulesPanel({ card, defaultOpen = false }: { card: ScoreCard; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { rules } = card;

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left font-medium text-gray-900 dark:text-white"
      >
        <span className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> How scoring works
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
          {rules.overview && <p>{rules.overview}</p>}
          {rules.scoring.length > 0 && (
            <ul className="list-disc pl-5 space-y-1">
              {rules.scoring.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {rules.winning && (
            <p>
              <span className="font-semibold">Winning: </span>
              {rules.winning}
            </p>
          )}
          {rules.assumptions.length > 0 && (
            <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-3">
              <p className="font-semibold text-amber-900 dark:text-amber-200 mb-1">Interpretations used</p>
              <ul className="list-disc pl-5 space-y-1 text-amber-900 dark:text-amber-100">
                {rules.assumptions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
