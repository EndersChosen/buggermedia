/**
 * Score card schema (version 2).
 *
 * A score card is a declarative description of how a game is scored. The AI
 * fills this schema in (via structured output), the app validates it, and a
 * deterministic engine (engine.ts) renders and scores it. No model-written code
 * is ever executed: all maths lives in expressions handled by expression.ts.
 *
 * Two layouts cover almost every tabletop scoring style:
 *  - "rounds": the same inputs are entered for every player each round/hand
 *    (Hearts, Skull King, Rummy, Uno, Phase 10, Oh Hell...). A `roundScore`
 *    expression turns one player's inputs into that round's points.
 *  - "categories": a one-off score sheet where every player fills a list of
 *    rows once (Yahtzee, Ticket to Ride, 7 Wonders, Wingspan...). Each row is
 *    worth points, plus optional computed bonus rows.
 *
 * Every property is required but may be null. That shape works with strict
 * structured-output modes (Anthropic and OpenAI) and keeps hand-edited cards
 * and AI-generated cards identical.
 */

import { z } from 'zod';

export const SCORECARD_SCHEMA_VERSION = 2;

export const FieldOptionSchema = z
  .object({
    label: z.string().describe('What the player sees, e.g. "Small straight"'),
    value: z.number().describe('Numeric value / points this option is worth'),
  })
  .strict();

export const FieldSchema = z
  .object({
    id: z
      .string()
      .describe(
        'Identifier used in expressions: letters, digits and underscores, starting with a letter (e.g. "bid", "tricks_won").'
      ),
    label: z.string().describe('Short label shown on the score card'),
    type: z
      .enum(['number', 'boolean', 'select'])
      .describe('number = typed number, boolean = checkbox (1/0), select = pick one option'),
    section: z
      .string()
      .nullable()
      .describe('Optional group heading (categories layout), e.g. "Upper section"'),
    helpText: z.string().nullable().describe('One short hint for players, or null'),
    min: z.number().nullable().describe('Smallest allowed value, or null for no limit'),
    max: z.number().nullable().describe('Largest allowed value, or null for no limit'),
    maxExpression: z
      .string()
      .nullable()
      .describe(
        'Expression for a dynamic maximum (rounds layout), e.g. "round" or "cardsDealt". Null if not needed.'
      ),
    step: z.number().nullable().describe('Input step, e.g. 5 when scores move in fives. Null for 1.'),
    defaultValue: z.number().nullable().describe('Starting value, or null for empty/0'),
    points: z
      .number()
      .nullable()
      .describe('For boolean fields on a categories card: points scored when checked'),
    options: z
      .array(FieldOptionSchema)
      .nullable()
      .describe('Options for select fields (required for select, null otherwise)'),
    scoreExpression: z
      .string()
      .nullable()
      .describe(
        'Categories layout only: converts the entered `value` into points, e.g. "value * 15". Null means the value itself (or `points` for a checkbox).'
      ),
  })
  .strict();

export const RoundCheckSchema = z
  .object({
    expression: z
      .string()
      .describe('Expression that must be true (non-zero) for a valid round, e.g. "sumAll(points) == 26"'),
    message: z.string().describe('Message shown when the check fails'),
    severity: z
      .enum(['error', 'warning'])
      .describe('error blocks saving the round; warning only shows a notice'),
  })
  .strict();

export const BonusSchema = z
  .object({
    id: z.string().describe('Identifier, usable by later bonuses'),
    label: z.string(),
    expression: z
      .string()
      .describe(
        'Points for this bonus row, computed from category scores, e.g. "ones + twos + threes + fours + fives + sixes >= 63 ? 35 : 0"'
      ),
    helpText: z.string().nullable(),
  })
  .strict();

export const EndConditionSchema = z
  .object({
    type: z
      .enum(['fixed-rounds', 'target-score', 'manual', 'all-filled'])
      .describe(
        'fixed-rounds: ends after N rounds. target-score: ends after the round in which someone reaches the target. manual: players end it. all-filled: categories card is complete.'
      ),
    rounds: z.number().int().nullable().describe('Number of rounds for fixed-rounds'),
    roundsExpression: z
      .string()
      .nullable()
      .describe('Rounds that depend on player count, e.g. "floor(51 / players)". Overrides `rounds`.'),
    target: z.number().nullable().describe('Score that triggers the end for target-score'),
  })
  .strict();

export const RulesSummarySchema = z
  .object({
    overview: z.string().describe('2-3 sentence description of the game'),
    scoring: z.array(z.string()).describe('Concise scoring rules, one per item'),
    winning: z.string().describe('How the game ends and who wins'),
    assumptions: z
      .array(z.string())
      .describe('Anything ambiguous in the rules and the interpretation you chose. Empty if none.'),
  })
  .strict();

export const ExampleSchema = z
  .object({
    description: z.string().describe('What situation this example checks, e.g. "One player shoots the moon"'),
    round: z
      .number()
      .int()
      .nullable()
      .describe('Rounds layout: the round number this example is played in (null means round 1)'),
    players: z
      .array(
        z
          .object({
            values: z
              .array(z.object({ field: z.string(), value: z.number() }).strict())
              .describe("This player's inputs (field id and value). Omitted fields use their default."),
            expected: z
              .number()
              .describe("Rounds layout: this player's points for the round. Categories layout: this player's total."),
          })
          .strict()
      )
      .describe('Every player in the example, in seat order'),
  })
  .strict();

export const ScoreCardSchema = z
  .object({
    schemaVersion: z.literal(SCORECARD_SCHEMA_VERSION),
    name: z.string().describe('Game name'),
    description: z.string().describe('One-sentence description for the game library'),
    minPlayers: z.number().int(),
    maxPlayers: z.number().int(),
    playerLabel: z
      .enum(['player', 'team'])
      .describe('"team" when scores are kept per team/partnership; players then enter team names'),
    layout: z.enum(['rounds', 'categories']),
    roundLabel: z.string().nullable().describe('Rounds layout: "Round", "Hand", "Deal"... Null for categories.'),
    fields: z
      .array(FieldSchema)
      .describe('Rounds layout: inputs entered per player each round. Categories layout: the score rows.'),
    roundScore: z
      .string()
      .nullable()
      .describe('Rounds layout: expression giving one player\'s points for the round. Null for categories.'),
    roundChecks: z
      .array(RoundCheckSchema)
      .describe('Rounds layout: sanity checks across all players for a round. Empty if none.'),
    bonuses: z
      .array(BonusSchema)
      .describe('Categories layout: computed bonus rows. Empty if none (always empty for rounds).'),
    end: EndConditionSchema,
    winner: z.enum(['highest', 'lowest']).describe('Whether the highest or lowest total wins'),
    examples: z
      .array(ExampleSchema)
      .describe(
        'Worked examples with the points each player should get according to the rules, computed by hand from the rules (not from your formulas). 2-4 examples covering normal play and the tricky cases. The app checks the formulas reproduce them.'
      ),
    rules: RulesSummarySchema,
  })
  .strict();

export type FieldOption = z.infer<typeof FieldOptionSchema>;
export type ScoreField = z.infer<typeof FieldSchema>;
export type RoundCheck = z.infer<typeof RoundCheckSchema>;
export type Bonus = z.infer<typeof BonusSchema>;
export type EndCondition = z.infer<typeof EndConditionSchema>;
export type RulesSummary = z.infer<typeof RulesSummarySchema>;
export type ScoreCard = z.infer<typeof ScoreCardSchema>;
export type ScoreExample = z.infer<typeof ExampleSchema>;

/** Names that every rounds-style expression can read. */
export const ROUND_CONTEXT_NAMES = ['round', 'players', 'total', 'playerIndex'] as const;

/** Names that categories-style expressions can read (besides field and bonus ids). */
export const CATEGORY_CONTEXT_NAMES = ['players'] as const;

/** Name available inside a field's scoreExpression. */
export const VALUE_NAME = 'value';

export const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

/** A blank field, used by the editor. */
export function emptyField(id: string): ScoreField {
  return {
    id,
    label: 'New field',
    type: 'number',
    section: null,
    helpText: null,
    min: null,
    max: null,
    maxExpression: null,
    step: null,
    defaultValue: null,
    points: null,
    options: null,
    scoreExpression: null,
  };
}

/**
 * Fill in properties that are allowed to be null but were left out.
 *
 * Some structured-output modes can only handle the schema with those
 * properties made optional, so the model may omit them; the app's types expect
 * explicit nulls/empty lists.
 */
export function fillOmittedNulls(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  const card = { ...(input as Record<string, unknown>) };
  const fill = (obj: unknown, keys: string[]) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    const copy = { ...(obj as Record<string, unknown>) };
    for (const k of keys) if (!(k in copy)) copy[k] = null;
    return copy;
  };
  const fieldKeys = ['section', 'helpText', 'min', 'max', 'maxExpression', 'step', 'defaultValue', 'points', 'options', 'scoreExpression'];
  if (!('roundLabel' in card)) card.roundLabel = null;
  if (!('roundScore' in card)) card.roundScore = null;
  if (!('roundChecks' in card)) card.roundChecks = [];
  if (!('bonuses' in card)) card.bonuses = [];
  if (!('examples' in card)) card.examples = [];
  if (Array.isArray(card.examples)) card.examples = card.examples.map((e) => fill(e, ['round']));
  if (Array.isArray(card.fields)) card.fields = card.fields.map((f) => fill(f, fieldKeys));
  if (Array.isArray(card.bonuses)) card.bonuses = card.bonuses.map((b) => fill(b, ['helpText']));
  card.end = fill(card.end, ['rounds', 'roundsExpression', 'target']);
  if (card.rules && typeof card.rules === 'object' && !Array.isArray(card.rules)) {
    const rules = { ...(card.rules as Record<string, unknown>) };
    if (!('assumptions' in rules)) rules.assumptions = [];
    if (!('scoring' in rules)) rules.scoring = [];
    card.rules = rules;
  }
  return card;
}
