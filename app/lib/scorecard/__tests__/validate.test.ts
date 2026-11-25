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
});
