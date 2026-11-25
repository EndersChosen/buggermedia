/**
 * Deterministic scoring engine for score cards.
 *
 * Pure functions only (no React, no storage) so they can be unit-tested and
 * used both in the play screen and in the editor's live preview.
 */

import { evaluateSource, ExpressionError } from './expression';
import type { ScoreCard, ScoreField } from './schema';

export interface PlayerRef {
  id: string;
  name: string;
}

/** fieldId -> entered value (null = left empty). */
export type FieldValues = Record<string, number | null>;

/** playerId -> that player's values. */
export type PlayerValues = Record<string, FieldValues>;

export interface RoundEntry {
  values: PlayerValues;
}

export interface Issue {
  message: string;
  severity: 'error' | 'warning';
  playerId?: string;
  fieldId?: string;
}

// ---------------------------------------------------------------------------
// Field helpers
// ---------------------------------------------------------------------------

/** The numeric value used for maths when a field is empty. */
export function effectiveValue(field: ScoreField, raw: number | null | undefined): number {
  if (raw === null || raw === undefined || Number.isNaN(raw)) {
    return field.defaultValue ?? 0;
  }
  if (field.type === 'boolean') return raw ? 1 : 0;
  return raw;
}

/** The value a fresh input should start with. */
export function initialValue(field: ScoreField): number | null {
  if (field.defaultValue !== null) return field.defaultValue;
  if (field.type === 'boolean') return 0;
  return null;
}

export function emptyValues(card: ScoreCard): FieldValues {
  return Object.fromEntries(card.fields.map((f) => [f.id, initialValue(f)]));
}

export function emptyPlayerValues(card: ScoreCard, players: PlayerRef[]): PlayerValues {
  return Object.fromEntries(players.map((p) => [p.id, emptyValues(card)]));
}

/** Resolve the dynamic maximum of a field, if any. */
export function fieldMaximum(
  field: ScoreField,
  context: { round?: number; players: number }
): number | null {
  if (field.maxExpression) {
    try {
      return evaluateSource(field.maxExpression, {
        vars: { round: context.round ?? 1, players: context.players },
      });
    } catch {
      return field.max;
    }
  }
  return field.max;
}

/** Check one entered value against the field's limits. Returns an error message or null. */
export function checkFieldValue(
  field: ScoreField,
  raw: number | null | undefined,
  context: { round?: number; players: number }
): string | null {
  if (raw === null || raw === undefined) return null;
  if (Number.isNaN(raw)) return `${field.label} must be a number`;
  if (field.type === 'select') {
    const ok = (field.options ?? []).some((o) => o.value === raw);
    return ok ? null : `${field.label}: pick one of the options`;
  }
  if (field.type === 'boolean') return null;
  if (field.min !== null && raw < field.min) return `${field.label} can't be less than ${field.min}`;
  const max = fieldMaximum(field, context);
  if (max !== null && raw > max) return `${field.label} can't be more than ${max}`;
  return null;
}

// ---------------------------------------------------------------------------
// Rounds layout
// ---------------------------------------------------------------------------

/** How many rounds a fixed-length game has, or null when open-ended. */
export function resolveRoundCount(card: ScoreCard, playerCount: number): number | null {
  if (card.layout !== 'rounds' || card.end.type !== 'fixed-rounds') return null;
  if (card.end.roundsExpression) {
    try {
      const n = Math.floor(
        evaluateSource(card.end.roundsExpression, { vars: { players: playerCount } })
      );
      if (n > 0) return n;
    } catch {
      // fall back to the static count below
    }
  }
  return card.end.rounds && card.end.rounds > 0 ? card.end.rounds : null;
}

export interface RoundResult {
  scores: Record<string, number>;
  issues: Issue[];
}

/**
 * Score one round. `totalsBefore` are the cumulative totals before this round
 * (exposed to expressions as `total`).
 */
export function scoreRound(
  card: ScoreCard,
  players: PlayerRef[],
  entry: RoundEntry,
  roundNumber: number,
  totalsBefore: Record<string, number>
): RoundResult {
  const issues: Issue[] = [];
  const scores: Record<string, number> = {};
  const ctx = { round: roundNumber, players: players.length };

  // Per-field validation
  for (const p of players) {
    for (const f of card.fields) {
      const err = checkFieldValue(f, entry.values[p.id]?.[f.id], ctx);
      if (err) issues.push({ message: `${p.name}: ${err}`, severity: 'error', playerId: p.id, fieldId: f.id });
    }
  }

  // Each player's identifier values: their fields plus round context.
  const perPlayer: Array<Record<string, number>> = players.map((p, index) => {
    const vars: Record<string, number> = {
      round: roundNumber,
      players: players.length,
      total: totalsBefore[p.id] ?? 0,
      playerIndex: index + 1,
    };
    for (const f of card.fields) vars[f.id] = effectiveValue(f, entry.values[p.id]?.[f.id]);
    return vars;
  });

  players.forEach((p, index) => {
    try {
      scores[p.id] = card.roundScore ? evaluateSource(card.roundScore, { vars: perPlayer[index], perPlayer }) : 0;
    } catch (e) {
      scores[p.id] = 0;
      issues.push({
        message: `Couldn't score ${p.name}: ${e instanceof ExpressionError ? e.message : String(e)}`,
        severity: 'error',
        playerId: p.id,
      });
    }
  });

  // Cross-player checks (evaluated without a "current player")
  for (const check of card.roundChecks) {
    try {
      const ok = evaluateSource(check.expression, {
        vars: { round: roundNumber, players: players.length },
        perPlayer,
      });
      if (!ok) issues.push({ message: check.message, severity: check.severity });
    } catch (e) {
      issues.push({
        message: `Check "${check.message}" couldn't run: ${e instanceof Error ? e.message : String(e)}`,
        severity: 'warning',
      });
    }
  }

  return { scores, issues };
}

export interface RoundsSummary {
  /** Score per player for each round, in order. */
  roundScores: Record<string, number>[];
  /** Cumulative total per player after each round. */
  runningTotals: Record<string, number>[];
  totals: Record<string, number>;
}

export function summarizeRounds(
  card: ScoreCard,
  players: PlayerRef[],
  rounds: RoundEntry[]
): RoundsSummary {
  const totals: Record<string, number> = Object.fromEntries(players.map((p) => [p.id, 0]));
  const roundScores: Record<string, number>[] = [];
  const runningTotals: Record<string, number>[] = [];

  rounds.forEach((entry, i) => {
    const { scores } = scoreRound(card, players, entry, i + 1, totals);
    for (const p of players) totals[p.id] += scores[p.id] ?? 0;
    roundScores.push(scores);
    runningTotals.push({ ...totals });
  });

  return { roundScores, runningTotals, totals };
}

// ---------------------------------------------------------------------------
// Categories layout
// ---------------------------------------------------------------------------

export interface CategoriesSummary {
  /** playerId -> row id (field or bonus) -> points */
  rowScores: Record<string, Record<string, number>>;
  totals: Record<string, number>;
  issues: Issue[];
}

/** Points a single category row is worth for an entered value. */
export function categoryRowScore(field: ScoreField, raw: number | null | undefined, players: number): number {
  const value = effectiveValue(field, raw);
  if (field.scoreExpression) {
    return evaluateSource(field.scoreExpression, { vars: { value, players } });
  }
  if (field.type === 'boolean') return value ? field.points ?? 1 : 0;
  return value;
}

export function summarizeCategories(
  card: ScoreCard,
  players: PlayerRef[],
  values: PlayerValues
): CategoriesSummary {
  const rowScores: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {};
  const issues: Issue[] = [];

  for (const p of players) {
    const rows: Record<string, number> = {};
    const vars: Record<string, number> = { players: players.length };

    for (const f of card.fields) {
      const raw = values[p.id]?.[f.id];
      const err = checkFieldValue(f, raw, { players: players.length });
      if (err) issues.push({ message: `${p.name}: ${err}`, severity: 'error', playerId: p.id, fieldId: f.id });
      let pts = 0;
      try {
        pts = categoryRowScore(f, raw, players.length);
      } catch (e) {
        issues.push({
          message: `Couldn't score ${f.label} for ${p.name}: ${e instanceof Error ? e.message : String(e)}`,
          severity: 'error',
          playerId: p.id,
          fieldId: f.id,
        });
      }
      rows[f.id] = pts;
      vars[f.id] = pts;
    }

    for (const b of card.bonuses) {
      let pts = 0;
      try {
        pts = evaluateSource(b.expression, { vars });
      } catch (e) {
        issues.push({
          message: `Couldn't score ${b.label} for ${p.name}: ${e instanceof Error ? e.message : String(e)}`,
          severity: 'error',
          playerId: p.id,
        });
      }
      rows[b.id] = pts;
      vars[b.id] = pts;
    }

    rowScores[p.id] = rows;
    totals[p.id] = Object.values(rows).reduce((s, v) => s + v, 0);
  }

  return { rowScores, totals, issues };
}

/** How many category inputs a player has filled in. */
export function filledCount(card: ScoreCard, values: FieldValues | undefined): number {
  if (!values) return 0;
  return card.fields.filter((f) => f.type === 'boolean' || (values[f.id] !== null && values[f.id] !== undefined))
    .length;
}

// ---------------------------------------------------------------------------
// Game end and standings
// ---------------------------------------------------------------------------

export function isRoundsGameOver(
  card: ScoreCard,
  players: PlayerRef[],
  rounds: RoundEntry[],
  totals: Record<string, number>
): boolean {
  if (rounds.length === 0) return false;
  switch (card.end.type) {
    case 'fixed-rounds': {
      const n = resolveRoundCount(card, players.length);
      return n !== null && rounds.length >= n;
    }
    case 'target-score': {
      const target = card.end.target;
      if (target === null) return false;
      return players.some((p) => (totals[p.id] ?? 0) >= target);
    }
    default:
      return false;
  }
}

export function isCategoriesComplete(card: ScoreCard, players: PlayerRef[], values: PlayerValues): boolean {
  return players.every((p) => filledCount(card, values[p.id]) === card.fields.length);
}

export interface Standing {
  player: PlayerRef;
  total: number;
  rank: number;
}

/** Players ordered best-first. Equal totals share a rank. */
export function standings(card: ScoreCard, players: PlayerRef[], totals: Record<string, number>): Standing[] {
  const dir = card.winner === 'lowest' ? 1 : -1;
  const sorted = [...players].sort((a, b) => dir * ((totals[a.id] ?? 0) - (totals[b.id] ?? 0)));
  const result: Standing[] = [];
  sorted.forEach((player, i) => {
    const total = totals[player.id] ?? 0;
    const prev = result[i - 1];
    const rank = prev && prev.total === total ? prev.rank : i + 1;
    result.push({ player, total, rank });
  });
  return result;
}

export function leaders(card: ScoreCard, players: PlayerRef[], totals: Record<string, number>): PlayerRef[] {
  if (players.length === 0) return [];
  return standings(card, players, totals)
    .filter((s) => s.rank === 1)
    .map((s) => s.player);
}
