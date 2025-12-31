/**
 * Engine Testing Utility
 *
 * Tests scoring, validation, and win condition engines with AI-generated game data.
 * Run this with: npx tsx app/lib/engines/test-engines.ts
 */

import type {
  DynamicGameDefinition,
  EvaluationContext,
  DynamicRoundData,
} from '@/lib/types/dynamic-game.types';
import { calculateRoundScores, calculateFinalScores, validateFormula } from './scoring';
import { validateRoundData, validateGameSession } from './validation';
import { checkWinCondition, getCurrentLeader } from './win-conditions';

/**
 * Example AI-generated game definition (based on Yahtzee structure)
 */
const exampleGameDefinition: DynamicGameDefinition = {
  rounds: {
    type: 'fixed',
    count: 13,
    numbered: true,
    fields: [
      {
        id: 'ones',
        label: 'Ones',
        type: 'number',
        perPlayer: true,
        validation: {
          min: 0,
          max: 5,
        },
        helperText: 'Sum of all ones rolled',
      },
      {
        id: 'selected_category',
        label: 'Selected Category',
        type: 'select',
        perPlayer: true,
        options: ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes', 'Yahtzee'],
        validation: {
          required: true,
        },
      },
      {
        id: 'score',
        label: 'Score',
        type: 'number',
        perPlayer: true,
        validation: {
          min: 0,
          required: true,
        },
      },
    ],
  },
  scoring: {
    formulas: [
      {
        id: 'round_score',
        name: 'Round Score',
        expression: 'score',
        variables: ['score'],
        scope: 'per-round',
        description: 'Score for this round',
      },
      {
        id: 'bonus',
        name: 'Bonus Points',
        expression: 'totalScore >= 63 ? 35 : 0',
        variables: ['totalScore'],
        scope: 'final',
        description: 'Bonus for upper section >= 63',
      },
    ],
  },
  validation: {
    rules: [],
  },
  ui: {
    components: [
      {
        type: 'score-input',
        config: {},
      },
      {
        type: 'score-board',
        config: {},
      },
    ],
  },
  winCondition: {
    type: 'highest-score',
    description: 'Player with highest score after 13 rounds wins',
  },
  metadata: {
    version: 1,
    generatedBy: 'ai',
    generatedAt: new Date().toISOString(),
  },
};

/**
 * Creates sample round data for testing
 */
function createSampleRoundData(
  roundNumber: number,
  playerIds: string[]
): DynamicRoundData {
  const fields: Record<string, any> = {};

  // Simulate player scores
  fields.score = {};
  playerIds.forEach((playerId, index) => {
    fields.score[playerId] = Math.floor(Math.random() * 50);
  });

  fields.selected_category = {};
  const categories = ['Ones', 'Twos', 'Threes', 'Fours', 'Fives', 'Sixes'];
  playerIds.forEach((playerId, index) => {
    fields.selected_category[playerId] = categories[roundNumber % categories.length];
  });

  return {
    roundNumber,
    fields,
  };
}

/**
 * Test the scoring engine
 */
function testScoringEngine() {
  console.log('\n=== Testing Scoring Engine ===\n');

  const playerIds = ['player1', 'player2', 'player3'];
  const roundData = createSampleRoundData(1, playerIds);

  console.log('Round Data:', JSON.stringify(roundData.fields, null, 2));

  const context: EvaluationContext = {
    currentRound: 1,
    totalRounds: 13,
    roundData: roundData.fields,
    allRounds: [roundData],
    playerIds,
    totalScores: {
      player1: 0,
      player2: 0,
      player3: 0,
    },
  };

  const result = calculateRoundScores(exampleGameDefinition, context);

  console.log('Calculated Scores:', result.scores);
  console.log('Updated Totals:', result.updatedTotals);

  if (result.errors) {
    console.error('Errors:', result.errors);
  }

  // Test formula validation
  console.log('\n--- Formula Validation ---');
  exampleGameDefinition.scoring.formulas.forEach((formula) => {
    const validation = validateFormula(formula);
    console.log(`Formula "${formula.name}":`, validation.valid ? '✓ Valid' : `✗ ${validation.error}`);
  });

  console.log('\n✓ Scoring engine test complete');
}

/**
 * Test the validation engine
 */
function testValidationEngine() {
  console.log('\n=== Testing Validation Engine ===\n');

  const playerIds = ['player1', 'player2'];

  // Test 1: Valid data
  const validRoundData = {
    score: {
      player1: 25,
      player2: 30,
    },
    selected_category: {
      player1: 'Ones',
      player2: 'Twos',
    },
  };

  const validContext: EvaluationContext = {
    currentRound: 1,
    totalRounds: 13,
    roundData: validRoundData,
    allRounds: [],
    playerIds,
    totalScores: {},
  };

  const validResult = validateRoundData(exampleGameDefinition, validRoundData, validContext);
  console.log('Valid Data Test:', validResult.isValid ? '✓ Passed' : '✗ Failed');
  if (!validResult.isValid) {
    console.log('Errors:', validResult.errors);
  }

  // Test 2: Invalid data (missing required field)
  const invalidRoundData = {
    score: {
      player1: 25,
      // Missing player2
    },
    selected_category: {
      player1: 'Ones',
      player2: 'Twos',
    },
  };

  const invalidContext: EvaluationContext = {
    currentRound: 1,
    totalRounds: 13,
    roundData: invalidRoundData,
    allRounds: [],
    playerIds,
    totalScores: {},
  };

  const invalidResult = validateRoundData(exampleGameDefinition, invalidRoundData, invalidContext);
  console.log('Invalid Data Test:', invalidResult.isValid ? '✗ Failed (should be invalid)' : '✓ Passed');
  if (!invalidResult.isValid) {
    console.log('Errors:', invalidResult.errors);
  }

  // Test 3: Out of range values
  const outOfRangeData = {
    ones: {
      player1: 10, // Max is 5
      player2: 3,
    },
    score: {
      player1: 25,
      player2: 30,
    },
    selected_category: {
      player1: 'Ones',
      player2: 'Twos',
    },
  };

  const outOfRangeContext: EvaluationContext = {
    currentRound: 1,
    totalRounds: 13,
    roundData: outOfRangeData,
    allRounds: [],
    playerIds,
    totalScores: {},
  };

  const outOfRangeResult = validateRoundData(exampleGameDefinition, outOfRangeData, outOfRangeContext);
  console.log('Out of Range Test:', outOfRangeResult.isValid ? '✗ Failed (should be invalid)' : '✓ Passed');
  if (!outOfRangeResult.isValid) {
    console.log('Errors:', outOfRangeResult.errors);
  }

  console.log('\n✓ Validation engine test complete');
}

/**
 * Test the win condition engine
 */
function testWinConditionEngine() {
  console.log('\n=== Testing Win Condition Engine ===\n');

  const playerIds = ['player1', 'player2', 'player3'];

  // Test 1: Game in progress
  const inProgressContext: EvaluationContext = {
    currentRound: 5,
    totalRounds: 13,
    roundData: {},
    allRounds: [],
    playerIds,
    totalScores: {
      player1: 150,
      player2: 175,
      player3: 160,
    },
  };

  const inProgressResult = checkWinCondition(exampleGameDefinition, inProgressContext);
  console.log('In Progress Test:', inProgressResult.isComplete ? '✗ Failed (should not be complete)' : '✓ Passed');
  console.log('Reason:', inProgressResult.reason);

  const leader = getCurrentLeader(inProgressContext.totalScores);
  console.log('Current Leader:', leader);

  // Test 2: Game complete with clear winner
  const completeContext: EvaluationContext = {
    currentRound: 13,
    totalRounds: 13,
    roundData: {},
    allRounds: [],
    playerIds,
    totalScores: {
      player1: 250,
      player2: 300,
      player3: 275,
    },
  };

  const completeResult = checkWinCondition(exampleGameDefinition, completeContext);
  console.log('\nComplete Game Test:', completeResult.isComplete ? '✓ Passed' : '✗ Failed');
  if (completeResult.winner) {
    console.log('Winner:', completeResult.winner.playerId, 'with score:', completeResult.winner.score);
    console.log('Reason:', completeResult.winner.reason);
  }

  // Test 3: Tie scenario
  const tieContext: EvaluationContext = {
    currentRound: 13,
    totalRounds: 13,
    roundData: {},
    allRounds: [],
    playerIds,
    totalScores: {
      player1: 300,
      player2: 300,
      player3: 275,
    },
  };

  const tieResult = checkWinCondition(exampleGameDefinition, tieContext);
  console.log('\nTie Test:', tieResult.isComplete ? '✓ Passed' : '✗ Failed');
  if (tieResult.winners) {
    console.log('Tied Winners:', tieResult.winners.map(w => `${w.playerId} (${w.score})`).join(', '));
  }

  console.log('\n✓ Win condition engine test complete');
}

/**
 * Main test runner
 */
export function runEngineTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Game Engine Test Suite               ║');
  console.log('╚════════════════════════════════════════╝');

  try {
    testScoringEngine();
    testValidationEngine();
    testWinConditionEngine();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   ✓ All Tests Passed!                  ║');
    console.log('╚════════════════════════════════════════╝\n');

    return true;
  } catch (error) {
    console.error('\n╔════════════════════════════════════════╗');
    console.error('║   ✗ Tests Failed                       ║');
    console.error('╚════════════════════════════════════════╝\n');
    console.error('Error:', error);

    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runEngineTests();
}
