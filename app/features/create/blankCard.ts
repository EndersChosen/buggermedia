import { emptyField, type ScoreCard } from '@/lib/scorecard/schema';

/** Starting point for building a score card by hand: one points field per round. */
export function blankCard(name = 'My game'): ScoreCard {
  return {
    schemaVersion: 2,
    name,
    description: 'A custom score card.',
    minPlayers: 2,
    maxPlayers: 6,
    playerLabel: 'player',
    layout: 'rounds',
    roundLabel: 'Round',
    fields: [{ ...emptyField('points'), label: 'Points this round' }],
    roundScore: 'points',
    roundChecks: [],
    bonuses: [],
    end: { type: 'manual', rounds: null, roundsExpression: null, target: null },
    winner: 'highest',
    examples: [],
    rules: { overview: '', scoring: ['Add up each round\'s points.'], winning: 'Highest total wins.', assumptions: [] },
  };
}
