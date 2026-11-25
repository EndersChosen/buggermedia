import { describe, expect, it } from 'vitest';
import {
  emptyPlayerValues,
  isCategoriesComplete,
  isRoundsGameOver,
  leaders,
  resolveRoundCount,
  scoreRound,
  standings,
  summarizeCategories,
  summarizeRounds,
  type RoundEntry,
} from '../engine';
import { biddingCard, heartsCard, players3, players4, ticketToRideCard, yahtzeeCard } from './fixtures';

const heartsRound = (a: number, b: number, c: number, d: number): RoundEntry => ({
  values: { a: { points: a }, b: { points: b }, c: { points: c }, d: { points: d } },
});

describe('rounds layout: Hearts', () => {
  it('scores normal hands and shooting the moon', () => {
    const normal = scoreRound(heartsCard, players4, heartsRound(13, 5, 8, 0), 1, {});
    expect(normal.scores).toEqual({ a: 13, b: 5, c: 8, d: 0 });
    expect(normal.issues).toEqual([]);

    const moon = scoreRound(heartsCard, players4, heartsRound(26, 0, 0, 0), 2, {});
    expect(moon.scores).toEqual({ a: 0, b: 26, c: 26, d: 26 });
  });

  it('warns when points do not add up to 26', () => {
    const { issues } = scoreRound(heartsCard, players4, heartsRound(10, 5, 0, 0), 1, {});
    expect(issues).toEqual([{ message: 'Penalty points should add up to 26', severity: 'warning' }]);
  });

  it('flags out-of-range values', () => {
    const { issues } = scoreRound(heartsCard, players4, heartsRound(27, 0, 0, -1), 1, {});
    expect(issues.filter((i) => i.severity === 'error').map((i) => i.playerId)).toEqual(['a', 'd']);
  });

  it('accumulates totals and ends at 100 with the lowest total winning', () => {
    const rounds = [
      heartsRound(13, 5, 8, 0),
      heartsRound(26, 0, 0, 0), // Ann shoots the moon
      heartsRound(0, 20, 6, 0),
      heartsRound(4, 4, 4, 14),
      heartsRound(9, 9, 8, 0),
      heartsRound(0, 26, 0, 0), // Ben shoots the moon
      heartsRound(0, 0, 26, 0), // Cat takes everything... and shoots the moon
    ];
    const summary = summarizeRounds(heartsCard, players4, rounds);
    expect(summary.totals).toEqual({ a: 13 + 0 + 0 + 4 + 9 + 26 + 26, b: 5 + 26 + 20 + 4 + 9 + 0 + 26, c: 8 + 26 + 6 + 4 + 8 + 26 + 0, d: 0 + 26 + 0 + 14 + 0 + 26 + 26 });
    expect(summary.totals).toEqual({ a: 78, b: 90, c: 78, d: 92 });
    expect(summary.runningTotals[1]).toEqual({ a: 13, b: 31, c: 34, d: 26 });
    expect(isRoundsGameOver(heartsCard, players4, rounds, summary.totals)).toBe(false);

    const more = [...rounds, heartsRound(10, 6, 5, 5)];
    const final = summarizeRounds(heartsCard, players4, more);
    expect(final.totals).toEqual({ a: 88, b: 96, c: 83, d: 97 });
    expect(isRoundsGameOver(heartsCard, players4, more, final.totals)).toBe(false);
    const last = [...more, heartsRound(0, 8, 13, 5)];
    const end = summarizeRounds(heartsCard, players4, last);
    expect(end.totals).toEqual({ a: 88, b: 104, c: 96, d: 102 });
    expect(isRoundsGameOver(heartsCard, players4, last, end.totals)).toBe(true);
    expect(leaders(heartsCard, players4, end.totals).map((p) => p.name)).toEqual(['Ann']);
    expect(standings(heartsCard, players4, end.totals).map((s) => [s.player.id, s.rank])).toEqual([
      ['a', 1],
      ['c', 2],
      ['d', 3],
      ['b', 4],
    ]);
  });
});

describe('rounds layout: bidding game', () => {
  const r = (round: number, bids: number[], tricks: number[], bonus: number[] = [0, 0, 0]): RoundEntry => ({
    values: Object.fromEntries(
      players3.map((p, i) => [p.id, { bid: bids[i], tricks: tricks[i], bonus: bonus[i] }])
    ),
  });

  it('uses round number in scoring and dynamic maximums', () => {
    const round3 = scoreRound(biddingCard, players3, r(3, [0, 2, 1], [0, 2, 1], [0, 30, 0]), 3, {});
    expect(round3.scores).toEqual({ a: 30, b: 70, c: 20 });
    expect(round3.issues).toEqual([]);

    const bad = scoreRound(biddingCard, players3, r(2, [3, 0, 0], [2, 0, 0]), 2, {});
    // bid of 3 is above the round-2 maximum
    expect(bad.issues.some((i) => i.fieldId === 'bid' && i.playerId === 'a')).toBe(true);
  });

  it('enforces the tricks-sum check as an error', () => {
    const { issues } = scoreRound(biddingCard, players3, r(3, [1, 1, 1], [1, 1, 0]), 3, {});
    expect(issues).toContainEqual({ message: 'Tricks must add up to the round number', severity: 'error' });
  });

  it('ends after the fixed number of rounds', () => {
    expect(resolveRoundCount(biddingCard, 3)).toBe(10);
    const rounds = Array.from({ length: 10 }, (_, i) => r(i + 1, [0, 0, 0], [0, 0, 0]));
    const summary = summarizeRounds(biddingCard, players3, rounds);
    // zero bids made every round: 10 * (1+2+...+10) = 550 each
    expect(summary.totals).toEqual({ a: 550, b: 550, c: 550 });
    expect(isRoundsGameOver(biddingCard, players3, rounds, summary.totals)).toBe(true);
    expect(isRoundsGameOver(biddingCard, players3, rounds.slice(0, 9), summary.totals)).toBe(false);
    expect(leaders(biddingCard, players3, summary.totals)).toHaveLength(3);
  });

  it('supports round counts that depend on player count', () => {
    const card = { ...biddingCard, end: { ...biddingCard.end, roundsExpression: 'floor(51 / players)' } };
    expect(resolveRoundCount(card, 3)).toBe(17);
    expect(resolveRoundCount(card, 5)).toBe(10);
  });
});

describe('categories layout', () => {
  it('scores Yahtzee including the upper bonus and extra Yahtzees', () => {
    const values = emptyPlayerValues(yahtzeeCard, players3);
    Object.assign(values.a, {
      ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18, // 63 -> bonus
      three_kind: 22, four_kind: 0, full_house: 1, small_straight: 1, large_straight: 0, yahtzee: 1, chance: 23,
      yahtzee_bonus: 1,
    });
    Object.assign(values.b, {
      ones: 2, twos: 4, threes: 6, fours: 8, fives: 10, sixes: 12, // 42 -> no bonus
      three_kind: 17, four_kind: 21, full_house: 0, small_straight: 1, large_straight: 1, yahtzee: 0, chance: 19,
      yahtzee_bonus: 0,
    });
    const s = summarizeCategories(yahtzeeCard, players3, values);
    expect(s.issues).toEqual([]);
    expect(s.rowScores.a.upper_bonus).toBe(35);
    expect(s.rowScores.a.yahtzee_bonus).toBe(100);
    expect(s.totals.a).toBe(63 + 35 + 22 + 0 + 25 + 30 + 0 + 50 + 23 + 100);
    expect(s.rowScores.b.upper_bonus).toBe(0);
    expect(s.totals.b).toBe(42 + 17 + 21 + 30 + 40 + 19);
    expect(s.totals.c).toBe(0);
    expect(isCategoriesComplete(yahtzeeCard, players3, values)).toBe(false);
  });

  it('flags category values above the maximum', () => {
    const values = emptyPlayerValues(yahtzeeCard, players3);
    values.a.ones = 6;
    const s = summarizeCategories(yahtzeeCard, players3, values);
    expect(s.issues[0]).toMatchObject({ playerId: 'a', fieldId: 'ones', severity: 'error' });
  });

  it('scores Ticket to Ride with per-length multipliers and negative tickets', () => {
    const values = emptyPlayerValues(ticketToRideCard, players3);
    Object.assign(values.a, { len1: 2, len2: 3, len3: 2, len4: 1, len5: 0, len6: 2, tickets_done: 21, tickets_failed: 8, longest: 1 });
    Object.assign(values.b, { len1: 0, len2: 1, len3: 4, len4: 2, len5: 1, len6: 0, tickets_done: 30, tickets_failed: 0, longest: 0 });
    Object.assign(values.c, { len1: 0, len2: 0, len3: 0, len4: 0, len5: 0, len6: 0, tickets_done: 0, tickets_failed: 0, longest: 0 });
    const s = summarizeCategories(ticketToRideCard, players3, values);
    expect(s.totals.a).toBe(2 + 6 + 8 + 7 + 0 + 30 + 21 - 8 + 10);
    expect(s.totals.b).toBe(0 + 2 + 16 + 14 + 10 + 0 + 30);
    expect(s.totals.c).toBe(0);
    expect(isCategoriesComplete(ticketToRideCard, players3, values)).toBe(true);
    expect(leaders(ticketToRideCard, players3, s.totals).map((p) => p.id)).toEqual(['a']);
  });
});
