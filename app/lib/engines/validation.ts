/**
 * Validation Engine
 *
 * Validates round data against game definition rules.
 * Supports field-level validation and custom validation rules.
 */

import type {
  DynamicGameDefinition,
  RoundField,
  ValidationRule,
  ValidationResult,
  EvaluationContext,
} from '@/lib/types/dynamic-game.types';

/**
 * Safely evaluates a boolean validation expression
 */
function evaluateValidationRule(
  expression: string,
  context: Record<string, any>
): boolean {
  try {
    // Add common helper functions
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
    console.error(`Error evaluating validation rule "${expression}":`, error);
    return false; // Fail validation if expression errors
  }
}

/**
 * Safely evaluates a numeric expression
 */
function evaluateNumericExpression(
  expression: string,
  context: Record<string, any>
): number {
  try {
    // Add common helper functions
    const extendedContext = {
      ...context,
      Math,
      abs: Math.abs,
      min: Math.min,
      max: Math.max,
    };

    const func = new Function(...Object.keys(extendedContext), `return (${expression});`);
    const result = func(...Object.values(extendedContext));

    return Number(result);
  } catch (error) {
    console.error(`Error evaluating numeric expression "${expression}":`, error);
    return 0; // Return 0 if expression errors
  }
}

/**
 * Builds a context object for validation from round data
 */
function buildValidationContext(
  roundData: Record<string, any>,
  gameContext: EvaluationContext
): Record<string, any> {
  const context: Record<string, any> = {
    currentRound: gameContext.currentRound,
    totalRounds: gameContext.totalRounds,
  };

  // Add all round data to context
  Object.entries(roundData).forEach(([fieldId, value]) => {
    context[fieldId] = value;

    // Add helper for per-player fields
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Add sum helper
      context[`${fieldId}_sum`] = Object.values(value).reduce(
        (acc: number, val: any) => acc + (Number(val) || 0),
        0
      );

      // Add count helper
      context[`${fieldId}_count`] = Object.keys(value).length;

      // Add individual access
      Object.entries(value).forEach(([playerId, playerValue]) => {
        context[`${fieldId}_${playerId}`] = playerValue;
      });
    }
  });

  // Add helper functions
  context.sum = (obj: Record<string, number> | number[]) => {
    if (Array.isArray(obj)) {
      return obj.reduce((acc, val) => acc + (Number(val) || 0), 0);
    }
    return Object.values(obj).reduce((acc, val) => acc + (Number(val) || 0), 0);
  };

  context.count = (obj: Record<string, any> | any[]) => {
    if (Array.isArray(obj)) {
      return obj.length;
    }
    return Object.keys(obj).length;
  };

  return context;
}

/**
 * Validates a single field value
 */
function validateField(
  field: RoundField,
  value: any,
  context: Record<string, any>
): { valid: boolean; error?: string } {
  // Check required
  if (field.validation?.required) {
    if (value === undefined || value === null || value === '') {
      return { valid: false, error: `${field.label} is required` };
    }

    // For per-player fields, check all players have values
    if (field.perPlayer && typeof value === 'object') {
      const missingPlayers = context.playerIds?.filter((id: string) => {
        return value[id] === undefined || value[id] === null || value[id] === '';
      });

      if (missingPlayers && missingPlayers.length > 0) {
        return { valid: false, error: `${field.label} is required for all players` };
      }
    }
  }

  // For number fields, validate numeric constraints
  if (field.type === 'number' && field.validation) {
    const validateNumber = (num: any, playerName?: string) => {
      if (num === undefined || num === null || num === '') {
        return null; // Skip if not required and empty
      }

      const numValue = Number(num);

      if (isNaN(numValue)) {
        return `${field.label}${playerName ? ` for ${playerName}` : ''} must be a number`;
      }

      // Check min
      if (field.validation?.min !== undefined && numValue < field.validation.min) {
        return `${field.label}${playerName ? ` for ${playerName}` : ''} must be at least ${field.validation.min}`;
      }

      // Check max
      if (field.validation?.max !== undefined && numValue > field.validation.max) {
        return `${field.label}${playerName ? ` for ${playerName}` : ''} must be at most ${field.validation.max}`;
      }

      // Check max expression
      if (field.validation?.maxExpression) {
        const maxValue = evaluateNumericExpression(field.validation.maxExpression, context);
        if (numValue > maxValue) {
          return `${field.label}${playerName ? ` for ${playerName}` : ''} cannot exceed ${maxValue}`;
        }
      }

      return null;
    };

    if (field.perPlayer && typeof value === 'object') {
      // Validate each player's value
      for (const [playerId, playerValue] of Object.entries(value)) {
        const playerName = context.playerNames?.[playerId] || playerId;
        const error = validateNumber(playerValue, playerName);
        if (error) {
          return { valid: false, error };
        }
      }
    } else {
      const error = validateNumber(value);
      if (error) {
        return { valid: false, error };
      }
    }

    // Check sum constraints for per-player fields
    if (field.perPlayer && typeof value === 'object') {
      const sum = Object.values(value).reduce(
        (acc: number, val: any) => acc + (Number(val) || 0),
        0
      );

      if (field.validation?.sum !== undefined && sum !== field.validation.sum) {
        return {
          valid: false,
          error: `Total ${field.label} must equal ${field.validation.sum} (currently ${sum})`,
        };
      }

      if (field.validation?.sumExpression) {
        const isValid = evaluateValidationRule(
          field.validation.sumExpression.replace(/sum/g, String(sum)),
          context
        );
        if (!isValid) {
          return {
            valid: false,
            error: `Total ${field.label} violates constraint: ${field.validation.sumExpression}`,
          };
        }
      }
    }
  }

  // For select fields, validate options
  if ((field.type === 'select' || field.type === 'multi-select') && field.options) {
    const validateOption = (opt: any) => {
      if (!opt) return null;

      if (field.type === 'multi-select' && Array.isArray(opt)) {
        const invalid = opt.filter((o) => !field.options?.includes(o));
        if (invalid.length > 0) {
          return `Invalid options: ${invalid.join(', ')}`;
        }
      } else if (!field.options?.includes(opt)) {
        return `${opt} is not a valid option`;
      }

      return null;
    };

    if (field.perPlayer && typeof value === 'object') {
      for (const [playerId, playerValue] of Object.entries(value)) {
        const error = validateOption(playerValue);
        if (error) {
          return { valid: false, error };
        }
      }
    } else {
      const error = validateOption(value);
      if (error) {
        return { valid: false, error };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates round data against game definition
 */
export function validateRoundData(
  definition: DynamicGameDefinition,
  roundData: Record<string, any>,
  gameContext: EvaluationContext
): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  // Build validation context
  const context = buildValidationContext(roundData, gameContext);

  // Add player info to context
  context.playerIds = gameContext.playerIds;
  context.playerNames = gameContext.playerIds.reduce((acc, id, idx) => {
    acc[id] = `Player ${idx + 1}`;
    return acc;
  }, {} as Record<string, string>);

  // Validate each field
  for (const field of definition.rounds.fields) {
    const value = roundData[field.id];
    const fieldValidation = validateField(field, value, context);

    if (!fieldValidation.valid && fieldValidation.error) {
      errors.push({
        field: field.id,
        message: fieldValidation.error,
        severity: 'error',
      });
    }
  }

  // Validate custom rules
  for (const rule of definition.validation.rules) {
    const isValid = evaluateValidationRule(rule.rule, context);

    if (!isValid) {
      errors.push({
        field: rule.field,
        message: rule.errorMessage,
        severity: rule.severity || 'error',
      });
    }
  }

  return {
    isValid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

/**
 * Validates a complete game session
 */
export function validateGameSession(
  definition: DynamicGameDefinition,
  allRounds: any[],
  gameContext: EvaluationContext
): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  // Validate each round
  allRounds.forEach((round, index) => {
    const roundContext: EvaluationContext = {
      ...gameContext,
      currentRound: index + 1,
      roundData: round.fields || {},
    };

    const roundValidation = validateRoundData(definition, round.fields || {}, roundContext);

    if (!roundValidation.isValid) {
      roundValidation.errors.forEach((error) => {
        errors.push({
          ...error,
          message: `Round ${index + 1}: ${error.message}`,
        });
      });
    }
  });

  return {
    isValid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  };
}

/**
 * Checks if a field value is valid (for real-time validation)
 */
export function isFieldValid(
  field: RoundField,
  value: any,
  context: Record<string, any>
): boolean {
  const result = validateField(field, value, context);
  return result.valid;
}

/**
 * Gets validation error message for a field
 */
export function getFieldError(
  field: RoundField,
  value: any,
  context: Record<string, any>
): string | undefined {
  const result = validateField(field, value, context);
  return result.error;
}
