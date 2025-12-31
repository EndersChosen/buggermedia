/**
 * Win Condition Engine
 *
 * Determines when a game is complete and who won based on win conditions.
 * Supports highest-score, lowest-score, first-to-target, and custom conditions.
 */

import type {
  DynamicGameDefinition,
  WinCondition,
  EvaluationContext,
} from '@/lib/types/dynamic-game.types';

export interface WinCheckResult {
  /** Whether the game is complete */
  isComplete: boolean;

  /** Winner information (if game is complete) */
  winner?: {
    playerId: string;
    score: number;
    reason?: string;
  };

  /** Multiple winners (for ties) */
  winners?: Array<{
    playerId: string;
    score: number;
  }>;

  /** Reason for incompleteness (if not complete) */
  reason?: string;
}

/**
 * Safely evaluates a custom win condition expression
 */
function evaluateCustomCondition(
  expression: string,
  context: Record<string, any>
): boolean {
  try {
    const extendedContext = {
      ...context,
      Math,
      abs: Math.abs,
      min: Math.min,
      max: Math.max,
    };

    const func = new Function(...Object.keys(extendedContext), `return !!(${expression});`);
    const result = func(...Object.values(extendedContext));

    return Boolean(result);
  } catch (error) {
    console.error(`Error evaluating custom win condition "${expression}":`, error);
    return false;
  }
}

/**
 * Builds context for win condition evaluation
 */
function buildWinContext(gameContext: EvaluationContext): Record<string, any> {
  const context: Record<string, any> = {
    currentRound: gameContext.currentRound,
    totalRounds: gameContext.totalRounds,
    scores: gameContext.totalScores,
    playerIds: gameContext.playerIds,
  };

  // Add individual player scores
  gameContext.playerIds.forEach((playerId, index) => {
    context[`player${index + 1}_score`] = gameContext.totalScores[playerId] || 0;
    context[`player_${playerId}_score`] = gameContext.totalScores[playerId] || 0;
  });

  // Add helper functions
  context.maxScore = Math.max(...Object.values(gameContext.totalScores));
  context.minScore = Math.min(...Object.values(gameContext.totalScores));

  context.getPlayerScore = (playerId: string) => gameContext.totalScores[playerId] || 0;

  context.getMaxScore = () => Math.max(...Object.values(gameContext.totalScores));
  context.getMinScore = () => Math.min(...Object.values(gameContext.totalScores));

  return context;
}

/**
 * Finds the player(s) with the highest score
 */
function findHighestScore(scores: Record<string, number>): WinCheckResult['winner'][] {
  if (Object.keys(scores).length === 0) {
    return [];
  }

  const maxScore = Math.max(...Object.values(scores));
  const winners = Object.entries(scores)
    .filter(([_, score]) => score === maxScore)
    .map(([playerId, score]) => ({
      playerId,
      score,
    }));

  return winners;
}

/**
 * Finds the player(s) with the lowest score
 */
function findLowestScore(scores: Record<string, number>): WinCheckResult['winner'][] {
  if (Object.keys(scores).length === 0) {
    return [];
  }

  const minScore = Math.min(...Object.values(scores));
  const winners = Object.entries(scores)
    .filter(([_, score]) => score === minScore)
    .map(([playerId, score]) => ({
      playerId,
      score,
    }));

  return winners;
}

/**
 * Finds the first player to reach the target score
 */
function findFirstToTarget(
  scores: Record<string, number>,
  targetScore: number
): WinCheckResult['winner'] | null {
  for (const [playerId, score] of Object.entries(scores)) {
    if (score >= targetScore) {
      return {
        playerId,
        score,
        reason: `First to reach ${targetScore} points`,
      };
    }
  }

  return null;
}

/**
 * Checks if the game is complete based on round structure
 */
function isGameCompleteByRounds(
  roundType: 'fixed' | 'variable' | 'infinite',
  currentRound: number,
  totalRounds?: number
): boolean {
  if (roundType === 'fixed' && totalRounds) {
    return currentRound >= totalRounds;
  }

  // For variable and infinite, game completion is determined by win condition
  return false;
}

/**
 * Checks win condition for a game
 */
export function checkWinCondition(
  definition: DynamicGameDefinition,
  gameContext: EvaluationContext
): WinCheckResult {
  const { winCondition } = definition;
  const scores = gameContext.totalScores;

  // First check if game is complete by round count
  const roundsComplete = isGameCompleteByRounds(
    definition.rounds.type,
    gameContext.currentRound,
    gameContext.totalRounds
  );

  // Build evaluation context
  const context = buildWinContext(gameContext);

  // Check win condition type
  switch (winCondition.type) {
    case 'highest-score': {
      if (!roundsComplete) {
        return {
          isComplete: false,
          reason: 'Game not yet complete',
        };
      }

      const winners = findHighestScore(scores);

      if (winners.length === 1) {
        return {
          isComplete: true,
          winner: {
            ...winners[0],
            reason: 'Highest score',
          },
        };
      } else if (winners.length > 1) {
        return {
          isComplete: true,
          winners,
        };
      }

      return {
        isComplete: true,
        reason: 'No valid scores',
      };
    }

    case 'lowest-score': {
      if (!roundsComplete) {
        return {
          isComplete: false,
          reason: 'Game not yet complete',
        };
      }

      const winners = findLowestScore(scores);

      if (winners.length === 1) {
        return {
          isComplete: true,
          winner: {
            ...winners[0],
            reason: 'Lowest score',
          },
        };
      } else if (winners.length > 1) {
        return {
          isComplete: true,
          winners,
        };
      }

      return {
        isComplete: true,
        reason: 'No valid scores',
      };
    }

    case 'first-to-target': {
      if (!winCondition.targetScore) {
        console.error('first-to-target win condition requires targetScore');
        return {
          isComplete: false,
          reason: 'Invalid win condition configuration',
        };
      }

      const winner = findFirstToTarget(scores, winCondition.targetScore);

      if (winner) {
        return {
          isComplete: true,
          winner,
        };
      }

      // Check if rounds are complete
      if (roundsComplete) {
        // Game is over but no one reached target - highest score wins
        const winners = findHighestScore(scores);
        if (winners.length === 1) {
          return {
            isComplete: true,
            winner: {
              ...winners[0],
              reason: `Highest score (target ${winCondition.targetScore} not reached)`,
            },
          };
        } else if (winners.length > 1) {
          return {
            isComplete: true,
            winners,
          };
        }
      }

      return {
        isComplete: false,
        reason: `Target score ${winCondition.targetScore} not yet reached`,
      };
    }

    case 'custom': {
      if (!winCondition.customExpression) {
        console.error('custom win condition requires customExpression');
        return {
          isComplete: false,
          reason: 'Invalid win condition configuration',
        };
      }

      const isComplete = evaluateCustomCondition(winCondition.customExpression, context);

      if (!isComplete) {
        return {
          isComplete: false,
          reason: 'Custom win condition not yet met',
        };
      }

      // Game is complete, determine winner by highest score
      const winners = findHighestScore(scores);

      if (winners.length === 1) {
        return {
          isComplete: true,
          winner: {
            ...winners[0],
            reason: winCondition.description || 'Custom win condition met',
          },
        };
      } else if (winners.length > 1) {
        return {
          isComplete: true,
          winners,
        };
      }

      return {
        isComplete: true,
        reason: 'Custom win condition met',
      };
    }

    default:
      console.error('Unknown win condition type:', winCondition.type);
      return {
        isComplete: false,
        reason: 'Unknown win condition type',
      };
  }
}

/**
 * Checks if a player has won (for real-time updates)
 */
export function hasPlayerWon(
  definition: DynamicGameDefinition,
  gameContext: EvaluationContext,
  playerId: string
): boolean {
  const result = checkWinCondition(definition, gameContext);

  if (!result.isComplete) {
    return false;
  }

  if (result.winner?.playerId === playerId) {
    return true;
  }

  if (result.winners?.some((w) => w.playerId === playerId)) {
    return true;
  }

  return false;
}

/**
 * Gets the current leader (for display purposes)
 */
export function getCurrentLeader(scores: Record<string, number>): {
  playerId: string;
  score: number;
  tied: boolean;
} | null {
  const winners = findHighestScore(scores);

  if (winners.length === 0) {
    return null;
  }

  return {
    playerId: winners[0].playerId,
    score: winners[0].score,
    tied: winners.length > 1,
  };
}

/**
 * Gets progress towards target (for first-to-target games)
 */
export function getTargetProgress(
  scores: Record<string, number>,
  targetScore: number
): Record<string, number> {
  const progress: Record<string, number> = {};

  Object.entries(scores).forEach(([playerId, score]) => {
    progress[playerId] = Math.min(100, (score / targetScore) * 100);
  });

  return progress;
}
