'use client';

import { Minus, Plus } from 'lucide-react';
import type { ScoreField } from '@/lib/scorecard/schema';

interface FieldInputProps {
  field: ScoreField;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  /** Resolved maximum (may come from maxExpression). */
  max: number | null;
  invalid?: boolean;
  /** Accessible label, e.g. "Ann – Bid". */
  ariaLabel: string;
  compact?: boolean;
}

export function FieldInput({ field, value, onChange, max, invalid, ariaLabel, compact }: FieldInputProps) {
  const base =
    'rounded-md border bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
  const border = invalid ? 'border-red-500' : 'border-gray-300 dark:border-gray-600';

  if (field.type === 'boolean') {
    return (
      <label className="inline-flex items-center gap-2 cursor-pointer select-none min-h-9">
        <input
          type="checkbox"
          aria-label={ariaLabel}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked ? 1 : 0)}
          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        {!compact && field.points !== null && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{field.points} pts</span>
        )}
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <select
        aria-label={ariaLabel}
        value={value === null || value === undefined ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={`${base} ${border} w-full px-2 py-1.5 text-sm`}
      >
        <option value="">—</option>
        {(field.options ?? []).map((o, i) => (
          <option key={`${o.value}-${i}`} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  const step = field.step ?? 1;
  const min = field.min;
  // On phones the score sheet is tight: drop the +/- buttons when the number
  // keypad is enough (non-negative values). Phone keypads often lack a minus
  // key, so fields that allow negatives keep them.
  const hideSteppers = compact && min !== null && min >= 0;
  const clamp = (n: number) => {
    let v = n;
    if (min !== null) v = Math.max(min, v);
    if (max !== null) v = Math.min(max, v);
    return v;
  };
  const bump = (dir: 1 | -1) => {
    const current = value ?? field.defaultValue ?? (min !== null && min > 0 ? min : 0);
    onChange(clamp(current + dir * step));
  };

  return (
    <div className="flex items-stretch gap-1">
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Decrease ${ariaLabel}`}
        onClick={() => bump(-1)}
        className={`${hideSteppers ? 'hidden sm:block' : ''} px-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600`}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        inputMode={min !== null && min >= 0 && Number.isInteger(step) ? 'numeric' : 'decimal'}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        value={value === null || value === undefined ? '' : value}
        min={min ?? undefined}
        max={max ?? undefined}
        step={step}
        placeholder={field.defaultValue !== null ? String(field.defaultValue) : '0'}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? null : Number(raw));
        }}
        className={`${base} ${border} w-full min-w-0 px-2 py-1.5 text-sm text-center tabular-nums`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={`Increase ${ariaLabel}`}
        onClick={() => bump(1)}
        className={`${hideSteppers ? 'hidden sm:block' : ''} px-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
