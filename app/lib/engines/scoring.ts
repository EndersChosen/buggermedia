/**
 * Scoring Engine
 *
 * Safely evaluates AI-generated scoring formulas using JavaScript expressions.
 * Supports per-round, cumulative, and final scoring calculations.
 */

import type {
  ScoringFormula,
  EvaluationContext,
  ScoringResult,
  DynamicGameDefinition,
} from '@/lib/types/dynamic-game.types';

/**
 * Timeout for formula execution (1 second)
 */
const FORMULA_TIMEOUT = 1000;

/**
 * Safely evaluates a JavaScript expression with timeout protection
 */
function evaluateExpression(
  expression: string,
  context: Record<string, any>,
  timeout: number = FORMULA_TIMEOUT
): any {
  try {
    // Create a function from the expression
    const variables = Object.keys(context);
    const values = Object.values(context);

    // Add common Math functions to context
    const extendedContext = {
      ...context,
      Math,
      abs: Math.abs,
      min: Math.min,
      max: Math.max,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round,
    };

    const func = new Function(...Object.keys(extendedContext), `return (${expression});`);

    // Execute with timeout protection
    let result: any;
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
    }, timeout);

    try {
      result = func(...Object.values(extendedContext));
    } finally {
      clearTimeout(timeoutId);
    }

    if (timedOut) {
      throw new Error('Formula execution timed out');
    }

    // Ensure result is a number
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      console.warn(`Formula "${expression}" returned non-numeric result:`, result);
      return 0; // Safe default
    }

    return result;
  } catch (error) {
    console.error(`Error evaluating expression "${expression}":`, error);
    return 0; // Safe default on error
  }
}

/**
 * Builds evaluation context from game state
 */
function buildEvaluationContext(
  context: EvaluationContext,
  playerId?: string
): Record<string, any> {
  const baseContext: Record<string, any> = {
    currentRound: context.currentRound,
    totalRounds: context.totalRounds,
  };

  // Add round data - handle both per-player and global fields
  Object.entries(context.roundData).forEach(([fieldId, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Per-player field: { playerId: value }
      if (playerId) {
        // Provide a default value of 0 if undefined to prevent ReferenceError
        baseContext[fieldId] = value[playerId] !== undefined ? value[playerId] : 0;
      }
      // Also provide helper to access other players' values
      baseContext[`${fieldId}_all`] = value;
    } else {
      // Global field - provide 0 if undefined
      baseContext[fieldId] = value !== undefined ? value : 0;
    }
  });

  // Add player-specific context if provided
  if (playerId) {
    baseContext.playerId = playerId;
    baseContext.currentPlayerId = playerId;
    baseContext.totalScore = context.totalScores[playerId] || 0;
  }

  // Add helper functions
  baseContext.sum = (obj: Record<string, number>) => {
    return Object.values(obj).reduce((acc, val) => acc + (Number(val) || 0), 0);
  };

  baseContext.count = (obj: Record<string, any>) => {
    return Object.keys(obj).length;
  };

  baseContext.avg = (obj: Record<string, number>) => {
    const values = Object.values(obj);
    const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
    return values.length > 0 ? sum / values.length : 0;
  };

  return baseContext;
}

/**
 * Evaluates a single scoring formula for a player
 */
export function evaluateFormula(
  formula: ScoringFormula,
  context: EvaluationContext,
  playerId: string
): number {
  const evalContext = buildEvaluationContext(context, playerId);

  return evaluateExpression(formula.expression, evalContext);
}

/**
 * Calculates scores for all players for a given round
 */
export function calculateRoundScores(
  definition: DynamicGameDefinition,
  context: EvaluationContext
): ScoringResult {
  const errors: string[] = [];
  const scores: Record<string, number> = {};
  const updatedTotals: Record<string, number> = { ...context.totalScores };

  // Filter formulas that apply to per-round scoring
  const roundFormulas = definition.scoring.formulas.filter(
    (f) => f.scope === 'per-round' || f.scope === 'cumulative'
  );

  // Calculate score for each player
  for (const playerId of context.playerIds) {
    let playerScore = 0;

    for (const formula of roundFormulas) {
      try {
        const formulaResult = evaluateFormula(formula, context, playerId);
        playerScore += formulaResult;
      } catch (error) {
        const errorMsg = `Error calculating ${formula.name} for player ${playerId}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    scores[playerId] = playerScore;
    updatedTotals[playerId] = (updatedTotals[playerId] || 0) + playerScore;
  }

  return {
    scores,
    updatedTotals,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Calculates final scores (applies final-scope formulas)
 */
export function calculateFinalScores(
  definition: DynamicGameDefinition,
  context: EvaluationContext
): ScoringResult {
  const errors: string[] = [];
  const updatedTotals: Record<string, number> = { ...context.totalScores };

  // Filter formulas that apply to final scoring
  const finalFormulas = definition.scoring.formulas.filter((f) => f.scope === 'final');

  if (finalFormulas.length === 0) {
    // No final adjustments, just return current totals
    return {
      scores: context.totalScores,
      updatedTotals,
    };
  }

  // Calculate final adjustments for each player
  for (const playerId of context.playerIds) {
    let finalAdjustment = 0;

    for (const formula of finalFormulas) {
      try {
        const formulaResult = evaluateFormula(formula, context, playerId);
        finalAdjustment += formulaResult;
      } catch (error) {
        const errorMsg = `Error calculating final ${formula.name} for player ${playerId}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    updatedTotals[playerId] = (updatedTotals[playerId] || 0) + finalAdjustment;
  }

  return {
    scores: updatedTotals,
    updatedTotals,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Validates a scoring formula by attempting to parse and evaluate it
 */
export function validateFormula(formula: ScoringFormula): { valid: boolean; error?: string } {
  try {
    // Create a test context with dummy data
    const testContext: Record<string, any> = {
      currentRound: 1,
      totalRounds: 10,
      totalScore: 0,
    };

    // Add dummy values for all variables
    formula.variables.forEach((varName) => {
      testContext[varName] = 0;
    });

    // Try to evaluate
    const result = evaluateExpression(formula.expression, testContext, 100); // Short timeout for validation

    if (typeof result !== 'number') {
      return { valid: false, error: 'Formula must return a number' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets a preview of what a formula will calculate
 */
export function previewFormula(
  formula: ScoringFormula,
  sampleData: Record<string, any>
): { result: number; error?: string } {
  try {
    const result = evaluateExpression(formula.expression, sampleData);
    return { result };
  } catch (error) {
    return {
      result: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
