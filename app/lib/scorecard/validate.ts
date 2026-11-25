/**
 * Validation for score cards.
 *
 * `validateScoreCard` takes untrusted JSON (from the AI, from the editor or
 * from storage), checks it against the Zod schema, then runs semantic checks
 * that a JSON schema can't express: identifiers are well-formed and unique,
 * every expression parses and only references names that exist, the end
 * condition is complete, and a dry run on sample data scores without errors.
 *
 * Error messages are written so they can be sent straight back to the model
 * in the repair loop.
 */

import {
  AGGREGATE_FUNCTIONS,
  ALL_FUNCTION_NAMES,
  collectIdentifiers,
  parseExpression,
  usesAggregates,
  type Expr,
} from './expression';
import {
  CATEGORY_CONTEXT_NAMES,
  IDENTIFIER_PATTERN,
  ROUND_CONTEXT_NAMES,
  SCORECARD_SCHEMA_VERSION,
  ScoreCardSchema,
  VALUE_NAME,
  type ScoreCard,
  type ScoreField,
} from './schema';
import { emptyPlayerValues, fieldMaximum, scoreRound, summarizeCategories, type PlayerRef, type PlayerValues } from './engine';

export interface ValidationResult {
  ok: boolean;
  /** The parsed (and lightly normalized) card, when it passed the schema check. */
  card: ScoreCard | null;
  errors: string[];
  warnings: string[];
}

const RESERVED = new Set<string>([
  ...ROUND_CONTEXT_NAMES,
  ...CATEGORY_CONTEXT_NAMES,
  VALUE_NAME,
  'true',
  'false',
  'and',
  'or',
  'not',
  ...ALL_FUNCTION_NAMES,
]);

const MAX_FIELDS = 60;
const MAX_PLAYERS = 20;

function tryParse(source: string, where: string, errors: string[]): Expr | null {
  try {
    return parseExpression(source);
  } catch (e) {
    errors.push(`${where}: ${e instanceof Error ? e.message : String(e)} (expression: ${source})`);
    return null;
  }
}

/** Identifiers used directly (not as an aggregate argument). */
function directIdentifiers(expr: Expr, out = new Set<string>()): Set<string> {
  switch (expr.kind) {
    case 'id':
      out.add(expr.name);
      break;
    case 'unary':
      directIdentifiers(expr.arg, out);
      break;
    case 'binary':
      directIdentifiers(expr.left, out);
      directIdentifiers(expr.right, out);
      break;
    case 'ternary':
      directIdentifiers(expr.test, out);
      directIdentifiers(expr.then, out);
      directIdentifiers(expr.else, out);
      break;
    case 'call':
      if (!(AGGREGATE_FUNCTIONS as readonly string[]).includes(expr.name)) {
        expr.args.forEach((a) => directIdentifiers(a, out));
      }
      break;
  }
  return out;
}

function checkNames(
  expr: Expr,
  allowed: Set<string>,
  where: string,
  errors: string[],
  allowedHint: string
) {
  const unknown = [...collectIdentifiers(expr)].filter((n) => !allowed.has(n));
  if (unknown.length) {
    errors.push(`${where} uses unknown name(s) ${unknown.join(', ')}. Allowed names: ${allowedHint}`);
  }
}

function formatZodPath(path: PropertyKey[]): string {
  return path.map((p) => (typeof p === 'number' ? `[${p}]` : `.${String(p)}`)).join('').replace(/^\./, '');
}

export function validateScoreCard(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Be forgiving about a missing/old version marker; everything else is strict.
  const candidate =
    input && typeof input === 'object' && !Array.isArray(input)
      ? { ...(input as Record<string, unknown>), schemaVersion: SCORECARD_SCHEMA_VERSION }
      : input;

  const parsed = ScoreCardSchema.safeParse(candidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 15)) {
      errors.push(`${formatZodPath(issue.path) || 'card'}: ${issue.message}`);
    }
    return { ok: false, card: null, errors, warnings };
  }

  const card: ScoreCard = structuredClone(parsed.data);
  card.name = card.name.trim();
  card.description = card.description.trim();

  // --- Metadata -------------------------------------------------------------
  if (!card.name) errors.push('name: must not be empty');
  if (card.minPlayers < 1) errors.push('minPlayers: must be at least 1');
  if (card.maxPlayers > MAX_PLAYERS) errors.push(`maxPlayers: must be at most ${MAX_PLAYERS}`);
  if (card.maxPlayers < card.minPlayers) errors.push('maxPlayers: must be greater than or equal to minPlayers');

  // --- Fields ---------------------------------------------------------------
  if (card.fields.length === 0) errors.push('fields: add at least one field');
  if (card.fields.length > MAX_FIELDS) errors.push(`fields: at most ${MAX_FIELDS} fields are supported`);

  const ids = new Set<string>();
  card.fields.forEach((f, i) => {
    const where = `fields[${i}] (${f.id || f.label})`;
    if (!IDENTIFIER_PATTERN.test(f.id)) {
      errors.push(`${where}: id "${f.id}" must start with a letter and use only letters, digits and underscores`);
    } else if (RESERVED.has(f.id)) {
      errors.push(`${where}: id "${f.id}" is a reserved word; pick another id`);
    } else if (ids.has(f.id)) {
      errors.push(`${where}: duplicate id "${f.id}"`);
    }
    ids.add(f.id);
    if (!f.label.trim()) errors.push(`${where}: label must not be empty`);
    if (f.min !== null && f.max !== null && f.min > f.max) errors.push(`${where}: min is greater than max`);
    if (f.type === 'select') {
      if (!f.options || f.options.length === 0) errors.push(`${where}: select fields need at least one option`);
    } else if (f.options && f.options.length) {
      warnings.push(`${where}: options are ignored for ${f.type} fields and were removed`);
      f.options = null;
    }
    if (f.step !== null && f.step <= 0) {
      warnings.push(`${where}: step must be positive; reset to 1`);
      f.step = null;
    }
    if (f.maxExpression) {
      const ast = tryParse(f.maxExpression, `${where}.maxExpression`, errors);
      if (ast) {
        const allowed = new Set<string>(['round', 'players']);
        checkNames(ast, allowed, `${where}.maxExpression`, errors, 'round, players');
        if (usesAggregates(ast)) errors.push(`${where}.maxExpression: aggregate functions aren't allowed here`);
      }
    }
  });

  // --- Layout specific --------------------------------------------------------
  if (card.layout === 'rounds') {
    validateRounds(card, ids, errors, warnings);
  } else {
    validateCategories(card, ids, errors, warnings);
  }

  // --- Dry run ----------------------------------------------------------------
  if (errors.length === 0) {
    dryRun(card, errors);
  }

  return { ok: errors.length === 0, card, errors, warnings };
}

function validateRounds(card: ScoreCard, ids: Set<string>, errors: string[], warnings: string[]) {
  const fieldNames = [...ids];
  const allowed = new Set<string>([...fieldNames, ...ROUND_CONTEXT_NAMES]);
  const hint = `${fieldNames.join(', ')}, ${ROUND_CONTEXT_NAMES.join(', ')}`;

  if (!card.roundScore) {
    errors.push('roundScore: rounds layout needs an expression for each player\'s round score');
  } else {
    const ast = tryParse(card.roundScore, 'roundScore', errors);
    if (ast) checkNames(ast, allowed, 'roundScore', errors, hint);
  }

  card.roundChecks.forEach((c, i) => {
    const where = `roundChecks[${i}]`;
    const ast = tryParse(c.expression, where, errors);
    if (!ast) return;
    checkNames(ast, allowed, where, errors, hint);
    const direct = [...directIdentifiers(ast)].filter((n) => ids.has(n));
    if (direct.length) {
      errors.push(
        `${where}: round checks apply to all players at once, so fields must be wrapped in an aggregate such as sumAll(${direct[0]})`
      );
    }
    if (!c.message.trim()) errors.push(`${where}: message must not be empty`);
  });

  if (card.bonuses.length) {
    warnings.push('bonuses are only used on categories cards and were removed');
    card.bonuses = [];
  }

  if (card.end.type === 'all-filled') {
    errors.push('end.type: "all-filled" is only for categories cards; use fixed-rounds, target-score or manual');
  }
  if (card.end.type === 'fixed-rounds') {
    if (card.end.roundsExpression) {
      const ast = tryParse(card.end.roundsExpression, 'end.roundsExpression', errors);
      if (ast) checkNames(ast, new Set(['players']), 'end.roundsExpression', errors, 'players');
    } else if (!card.end.rounds || card.end.rounds < 1) {
      errors.push('end.rounds: fixed-rounds needs a positive number of rounds (or a roundsExpression)');
    }
  }
  if (card.end.type === 'target-score' && card.end.target === null) {
    errors.push('end.target: target-score needs a target score');
  }
  if (!card.roundLabel) card.roundLabel = 'Round';
}

function validateCategories(card: ScoreCard, ids: Set<string>, errors: string[], warnings: string[]) {
  if (card.roundScore) {
    warnings.push('roundScore is only used on rounds cards and was removed');
    card.roundScore = null;
  }
  if (card.roundChecks.length) {
    warnings.push('roundChecks are only used on rounds cards and were removed');
    card.roundChecks = [];
  }
  if (card.end.type === 'fixed-rounds' || card.end.type === 'target-score') {
    warnings.push(`end.type "${card.end.type}" doesn't apply to a categories card; changed to "all-filled"`);
    card.end = { type: 'all-filled', rounds: null, roundsExpression: null, target: null };
  }
  card.roundLabel = null;

  card.fields.forEach((f, i) => {
    if (f.maxExpression) {
      errors.push(`fields[${i}] (${f.id}).maxExpression: only rounds cards can use a dynamic maximum`);
    }
    if (f.scoreExpression) {
      const where = `fields[${i}] (${f.id}).scoreExpression`;
      const ast = tryParse(f.scoreExpression, where, errors);
      if (ast) {
        checkNames(ast, new Set([VALUE_NAME, 'players']), where, errors, 'value, players');
        if (usesAggregates(ast)) errors.push(`${where}: aggregate functions aren't available on categories cards`);
      }
    }
  });

  const known = new Set<string>([...ids, ...CATEGORY_CONTEXT_NAMES]);
  card.bonuses.forEach((b, i) => {
    const where = `bonuses[${i}] (${b.id || b.label})`;
    if (!IDENTIFIER_PATTERN.test(b.id)) {
      errors.push(`${where}: id "${b.id}" must start with a letter and use only letters, digits and underscores`);
    } else if (RESERVED.has(b.id) || known.has(b.id)) {
      errors.push(`${where}: id "${b.id}" is reserved or already used`);
    }
    const ast = tryParse(b.expression, where, errors);
    if (ast) {
      checkNames(ast, known, where, errors, [...known].join(', '));
      if (usesAggregates(ast)) errors.push(`${where}: aggregate functions aren't available on categories cards`);
    }
    known.add(b.id);
  });
}

/** Representative values for a field: its default, a low value and a high value. */
function sampleValues(field: ScoreField, round: number, players: number): number[] {
  if (field.type === 'boolean') return [0, 1];
  if (field.type === 'select') return (field.options ?? []).map((o) => o.value).slice(0, 3);
  const lo = field.min ?? 0;
  const hi = fieldMaximum(field, { round, players }) ?? lo + 10;
  return [lo, Math.max(lo, Math.floor((lo + hi) / 2)), Math.max(lo, hi)];
}

function dryRun(card: ScoreCard, errors: string[]) {
  const n = Math.max(card.minPlayers, Math.min(card.maxPlayers, 4));
  const players: PlayerRef[] = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));

  // Three sample rounds: all defaults, all low, players spread across the range.
  const scenarios: PlayerValues[] = [emptyPlayerValues(card, players)];
  for (const pick of [0, 1, 2]) {
    const values: PlayerValues = {};
    players.forEach((p, pi) => {
      values[p.id] = {};
      for (const f of card.fields) {
        const samples = sampleValues(f, 3, n);
        values[p.id][f.id] = samples.length ? samples[(pick + pi) % samples.length] : null;
      }
    });
    scenarios.push(values);
  }

  const seen = new Set<string>();
  const report = (msg: string) => {
    if (!seen.has(msg) && seen.size < 5) {
      seen.add(msg);
      errors.push(`dry run: ${msg}`);
    }
  };

  for (const values of scenarios) {
    if (card.layout === 'rounds') {
      const { issues } = scoreRound(card, players, { values }, 3, {});
      issues
        .filter((i) => i.message.startsWith("Couldn't score"))
        .forEach((i) => report(i.message.replace(/Player \d+/, 'a player')));
    } else {
      const { issues } = summarizeCategories(card, players, values);
      issues
        .filter((i) => i.message.startsWith("Couldn't score"))
        .forEach((i) => report(i.message.replace(/Player \d+/, 'a player')));
    }
  }
}
