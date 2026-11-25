import { describe, expect, it } from 'vitest';
import { validateScoreCard } from '../validate';
import { biddingCard, heartsCard, ticketToRideCard, yahtzeeCard } from './fixtures';

const clone = <T>(v: T): T => structuredClone(v);

describe('validateScoreCard', () => {
  it.each([
    ['Hearts', heartsCard],
    ['bidding', biddingCard],
    ['Yahtzee', yahtzeeCard],
    ['Ticket to Ride', ticketToRideCard],
  ])('accepts the %s fixture', (_name, card) => {
    const result = validateScoreCard(card);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('rejects non-objects and schema violations with readable paths', () => {
    expect(validateScoreCard(null).ok).toBe(false);
    const bad = clone(heartsCard) as unknown as Record<string, unknown>;
    bad.layout = 'grid';
    delete bad.winner;
    const result = validateScoreCard(bad);
    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toMatch(/layout/);
    expect(result.errors.join('\n')).toMatch(/winner/);
  });

  it('rejects extra properties (strict schema)', () => {
    const bad = { ...clone(heartsCard), html: '<script>' };
    expect(validateScoreCard(bad).ok).toBe(false);
  });

  it('tolerates a missing schemaVersion', () => {
    const card = clone(heartsCard) as unknown as Record<string, unknown>;
    delete card.schemaVersion;
    expect(validateScoreCard(card).ok).toBe(true);
  });

  it('catches bad, reserved and duplicate field ids', () => {
    const card = clone(biddingCard);
    card.fields[0].id = 'Tricks Won';
    card.fields[1].id = 'round';
    card.fields[2].id = 'Tricks Won';
    const { errors } = validateScoreCard(card);
    expect(errors.some((e) => e.includes('must start with a letter'))).toBe(true);
    expect(errors.some((e) => e.includes('reserved'))).toBe(true);
  });

  it('catches unknown names and syntax errors in expressions', () => {
    const card = clone(biddingCard);
    card.roundScore = 'bid == tricks ? 20 * bid : penalty';
    const r1 = validateScoreCard(card);
    expect(r1.errors.join()).toMatch(/unknown name\(s\) penalty/);

    card.roundScore = 'bid ==';
    expect(validateScoreCard(card).errors.join()).toMatch(/roundScore/);

    card.roundScore = 'eval(1)';
    expect(validateScoreCard(card).errors.join()).toMatch(/Unknown function "eval"/);
  });

  it('requires aggregates in round checks', () => {
    const card = clone(heartsCard);
    card.roundChecks[0].expression = 'points == 26';
    expect(validateScoreCard(card).errors.join()).toMatch(/sumAll\(points\)/);
  });

  it('requires a complete end condition', () => {
    const card = clone(biddingCard);
    card.end = { type: 'fixed-rounds', rounds: null, roundsExpression: null, target: null };
    expect(validateScoreCard(card).errors.join()).toMatch(/end\.rounds/);

    const hearts = clone(heartsCard);
    hearts.end.target = null;
    expect(validateScoreCard(hearts).errors.join()).toMatch(/end\.target/);
  });

  it('checks player counts and select options', () => {
    const card = clone(heartsCard);
    card.minPlayers = 5;
    card.maxPlayers = 3;
    card.fields[0].type = 'select';
    const { errors } = validateScoreCard(card);
    expect(errors.join()).toMatch(/maxPlayers/);
    expect(errors.join()).toMatch(/at least one option/);
  });

  it('normalizes layout-irrelevant parts with warnings', () => {
    const card = clone(yahtzeeCard);
    card.roundScore = 'ones';
    card.end.type = 'fixed-rounds';
    const result = validateScoreCard(card);
    expect(result.ok).toBe(true);
    expect(result.card?.roundScore).toBeNull();
    expect(result.card?.end.type).toBe('all-filled');
    expect(result.warnings.length).toBe(2);
  });

  it('only lets bonuses reference earlier rows', () => {
    const card = clone(yahtzeeCard);
    card.bonuses = [
      { id: 'b1', label: 'B1', expression: 'b2 + 1', helpText: null },
      { id: 'b2', label: 'B2', expression: 'ones', helpText: null },
    ];
    expect(validateScoreCard(card).errors.join()).toMatch(/unknown name\(s\) b2/);
  });

  it('dry-runs scoring and reports runtime failures', () => {
    const card = clone(biddingCard);
    card.roundScore = '100 / tricks';
    const { errors } = validateScoreCard(card);
    expect(errors.join()).toMatch(/dry run: .*Division by zero/);
  });

  it('replays worked examples and reports mismatches', () => {
    const card = clone(heartsCard);
    card.examples = [
      {
        description: 'Normal hand',
        round: null,
        players: [
          { values: [{ field: 'points', value: 13 }], expected: 13 },
          { values: [{ field: 'points', value: 13 }], expected: 13 },
          { values: [{ field: 'points', value: 0 }], expected: 0 },
        ],
      },
      {
        description: 'Moon shot',
        round: 2,
        players: [
          { values: [{ field: 'points', value: 26 }], expected: 0 },
          { values: [], expected: 26 },
          { values: [], expected: 26 },
        ],
      },
    ];
    expect(validateScoreCard(card).errors).toEqual([]);

    card.examples[1].players[0].expected = 26;
    const { errors } = validateScoreCard(card);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Moon shot.*player 1 should get 26 but the formulas give 0/);
  });

  it('catches the "same player" shoot-the-moon bug through examples', () => {
    // A formula that only looks at maxima can't tell whether one player took
    // both the hearts and the queen; an example exposes it.
    const card = clone(heartsCard);
    card.fields = [
      { ...card.fields[0], id: 'hearts', label: 'Hearts', max: 13 },
      { ...card.fields[0], id: 'queen', label: 'Queen of spades', type: 'boolean', min: null, max: null },
    ];
    card.roundChecks = [];
    card.roundScore = 'maxAll(hearts) == 13 && sumAll(queen) == 1 ? ((hearts == 13 && queen == 1) ? 0 : 26) : hearts + 13 * queen';
    card.examples = [
      {
        description: 'Hearts and queen split',
        round: null,
        players: [
          { values: [{ field: 'hearts', value: 13 }], expected: 13 },
          { values: [{ field: 'queen', value: 1 }], expected: 13 },
          { values: [], expected: 0 },
        ],
      },
    ];
    expect(validateScoreCard(card).ok).toBe(false);

    card.roundScore = 'maxAll(hearts + 13 * queen) == 26 ? (hearts + 13 * queen == 26 ? 0 : 26) : hearts + 13 * queen';
    expect(validateScoreCard(card).errors).toEqual([]);
  });

  it('checks category examples against totals', () => {
    const card = clone(ticketToRideCard);
    card.examples = [
      {
        description: 'Typical end of game',
        round: null,
        players: [
          { values: [{ field: 'len6', value: 1 }, { field: 'tickets_failed', value: 5 }, { field: 'longest', value: 1 }], expected: 20 },
          { values: [{ field: 'len3', value: 2 }], expected: 8 },
        ],
      },
    ];
    expect(validateScoreCard(card).errors).toEqual([]);
    card.examples[0].players[1].values.push({ field: 'nope', value: 1 });
    expect(validateScoreCard(card).errors.join()).toMatch(/unknown field "nope"/);
  });

  it('fills omitted nullable properties (relaxed structured output)', () => {
    const card = clone(biddingCard) as unknown as Record<string, unknown>;
    const fields = (card.fields as Array<Record<string, unknown>>).map((f) => {
      const copy = { ...f };
      for (const k of Object.keys(copy)) if (copy[k] === null) delete copy[k];
      return copy;
    });
    card.fields = fields;
    delete card.roundChecks;
    delete card.examples;
    delete (card.end as Record<string, unknown>).target;
    const result = validateScoreCard(card);
    expect(result.errors).toEqual([]);
    expect(result.card?.fields[0].helpText).toBeNull();
    expect(result.card?.examples).toEqual([]);
  });
});
