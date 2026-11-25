import { emptyField, type ScoreCard, type ScoreField } from '../schema';

function field(id: string, label: string, extra: Partial<ScoreField> = {}): ScoreField {
  return { ...emptyField(id), label, ...extra };
}

const rules = (overview: string) => ({ overview, scoring: [], winning: '', assumptions: [] });

/** Hearts: lowest score wins, game ends when someone reaches 100, shoot the moon. */
export const heartsCard: ScoreCard = {
  schemaVersion: 2,
  name: 'Hearts',
  description: 'Avoid hearts and the queen of spades.',
  minPlayers: 3,
  maxPlayers: 6,
  playerLabel: 'player',
  layout: 'rounds',
  roundLabel: 'Hand',
  fields: [field('points', 'Penalty points taken', { min: 0, max: 26 })],
  roundScore: 'maxAll(points) == 26 ? (points == 26 ? 0 : 26) : points',
  roundChecks: [{ expression: 'sumAll(points) == 26', message: 'Penalty points should add up to 26', severity: 'warning' }],
  bonuses: [],
  end: { type: 'target-score', rounds: null, roundsExpression: null, target: 100 },
  winner: 'lowest',
  theme: null,
  examples: [],
  rules: rules('Trick-taking game.'),
};

/** Simplified Skull King style bidding: 10 rounds, bid up to the round number. */
export const biddingCard: ScoreCard = {
  schemaVersion: 2,
  name: 'Bid Game',
  description: 'Predict your tricks.',
  minPlayers: 2,
  maxPlayers: 6,
  playerLabel: 'player',
  layout: 'rounds',
  roundLabel: 'Round',
  fields: [
    field('bid', 'Bid', { min: 0, maxExpression: 'round' }),
    field('tricks', 'Tricks won', { min: 0, maxExpression: 'round' }),
    field('bonus', 'Bonus points', { min: 0, step: 10 }),
  ],
  roundScore:
    'bid == 0 ? (tricks == 0 ? 10 * round : -10 * round) : (bid == tricks ? 20 * bid + bonus : -10 * abs(bid - tricks))',
  roundChecks: [{ expression: 'sumAll(tricks) == round', message: 'Tricks must add up to the round number', severity: 'error' }],
  bonuses: [],
  end: { type: 'fixed-rounds', rounds: 10, roundsExpression: null, target: null },
  winner: 'highest',
  theme: null,
  examples: [],
  rules: rules('Bidding game.'),
};

const upper = [
  ['ones', 'Ones', 5],
  ['twos', 'Twos', 10],
  ['threes', 'Threes', 15],
  ['fours', 'Fours', 20],
  ['fives', 'Fives', 25],
  ['sixes', 'Sixes', 30],
] as const;

/** Yahtzee: categories sheet with an upper-section bonus and Yahtzee bonuses. */
export const yahtzeeCard: ScoreCard = {
  schemaVersion: 2,
  name: 'Yahtzee',
  description: 'Roll five dice to fill 13 categories.',
  minPlayers: 1,
  maxPlayers: 8,
  playerLabel: 'player',
  layout: 'categories',
  roundLabel: null,
  fields: [
    ...upper.map(([id, label, max]) => field(id, label, { section: 'Upper section', min: 0, max })),
    field('three_kind', 'Three of a kind', { section: 'Lower section', min: 0, max: 30 }),
    field('four_kind', 'Four of a kind', { section: 'Lower section', min: 0, max: 30 }),
    field('full_house', 'Full house', { section: 'Lower section', type: 'boolean', points: 25 }),
    field('small_straight', 'Small straight', { section: 'Lower section', type: 'boolean', points: 30 }),
    field('large_straight', 'Large straight', { section: 'Lower section', type: 'boolean', points: 40 }),
    field('yahtzee', 'Yahtzee', { section: 'Lower section', type: 'boolean', points: 50 }),
    field('chance', 'Chance', { section: 'Lower section', min: 0, max: 30 }),
    field('yahtzee_bonus', 'Extra Yahtzees', {
      section: 'Lower section',
      min: 0,
      max: 10,
      scoreExpression: 'value * 100',
    }),
  ],
  roundScore: null,
  roundChecks: [],
  bonuses: [
    {
      id: 'upper_bonus',
      label: 'Upper bonus (63+)',
      expression: 'ones + twos + threes + fours + fives + sixes >= 63 ? 35 : 0',
      helpText: null,
    },
  ],
  end: { type: 'all-filled', rounds: null, roundsExpression: null, target: null },
  winner: 'highest',
  theme: null,
  examples: [],
  rules: rules('Dice game.'),
};

/** Ticket to Ride end-game scoring sheet. */
export const ticketToRideCard: ScoreCard = {
  schemaVersion: 2,
  name: 'Ticket to Ride',
  description: 'Claim railway routes across the map.',
  minPlayers: 2,
  maxPlayers: 5,
  playerLabel: 'player',
  layout: 'categories',
  roundLabel: null,
  fields: [
    field('len1', 'Routes of length 1', { section: 'Routes', min: 0 }),
    field('len2', 'Routes of length 2', { section: 'Routes', min: 0, scoreExpression: 'value * 2' }),
    field('len3', 'Routes of length 3', { section: 'Routes', min: 0, scoreExpression: 'value * 4' }),
    field('len4', 'Routes of length 4', { section: 'Routes', min: 0, scoreExpression: 'value * 7' }),
    field('len5', 'Routes of length 5', { section: 'Routes', min: 0, scoreExpression: 'value * 10' }),
    field('len6', 'Routes of length 6', { section: 'Routes', min: 0, scoreExpression: 'value * 15' }),
    field('tickets_done', 'Completed tickets (points)', { section: 'Tickets', min: 0 }),
    field('tickets_failed', 'Failed tickets (points)', {
      section: 'Tickets',
      min: 0,
      scoreExpression: '-value',
    }),
    field('longest', 'Longest continuous path', { section: 'Bonus', type: 'boolean', points: 10 }),
  ],
  roundScore: null,
  roundChecks: [],
  bonuses: [],
  end: { type: 'all-filled', rounds: null, roundsExpression: null, target: null },
  winner: 'highest',
  theme: null,
  examples: [],
  rules: rules('Train game.'),
};

export const players3 = [
  { id: 'a', name: 'Ann' },
  { id: 'b', name: 'Ben' },
  { id: 'c', name: 'Cat' },
];

export const players4 = [...players3, { id: 'd', name: 'Dan' }];
