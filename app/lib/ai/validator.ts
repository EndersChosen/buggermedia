import type { GameSummary, GameDefinition, GameRules } from './game-generator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate game summary
 */
export function validateGameSummary(summary: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof summary !== 'object' || summary === null) {
    return { isValid: false, errors: ['Summary must be an object'] };
  }

  const s = summary as Record<string, unknown>;

  if (!s.gameName || typeof s.gameName !== 'string') {
    errors.push('Missing or invalid gameName');
  }
  if (!s.overview || typeof s.overview !== 'string') {
    errors.push('Missing or invalid overview');
  }
  if (typeof s.minPlayers !== 'number' || s.minPlayers < 1) {
    errors.push('minPlayers must be a positive number');
  }
  if (typeof s.maxPlayers !== 'number' || s.maxPlayers < (s.minPlayers as number)) {
    errors.push('maxPlayers must be >= minPlayers');
  }
  if (!s.rounds || typeof s.rounds !== 'object') {
    errors.push('Missing or invalid rounds object');
  }
  if (!s.winCondition || typeof s.winCondition !== 'string') {
    errors.push('Missing or invalid winCondition');
  }
  if (!s.scoringOverview || typeof s.scoringOverview !== 'string') {
    errors.push('Missing or invalid scoringOverview');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate game definition
 */
export function validateGameDefinition(definition: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof definition !== 'object' || definition === null) {
    return { isValid: false, errors: ['Definition must be an object'] };
  }

  const d = definition as Record<string, unknown>;

  // Validate metadata
  if (!d.metadata || typeof d.metadata !== 'object') {
    errors.push('Missing or invalid metadata');
  } else {
    const meta = d.metadata as Record<string, unknown>;
    if (!meta.name || typeof meta.name !== 'string') {
      errors.push('metadata.name is required');
    }
    if (typeof meta.minPlayers !== 'number' || meta.minPlayers < 1) {
      errors.push('metadata.minPlayers must be a positive number');
    }
    if (typeof meta.maxPlayers !== 'number' || meta.maxPlayers < (meta.minPlayers as number)) {
      errors.push('metadata.maxPlayers must be >= minPlayers');
    }
  }

  // Validate rounds
  if (!d.rounds || typeof d.rounds !== 'object') {
    errors.push('Missing or invalid rounds');
  } else {
    const rounds = d.rounds as Record<string, unknown>;
    if (!Array.isArray(rounds.fields) || rounds.fields.length === 0) {
      errors.push('rounds.fields must be a non-empty array');
    } else {
      rounds.fields.forEach((field: unknown, idx: number) => {
        if (typeof field !== 'object' || field === null) {
          errors.push(`rounds.fields[${idx}] must be an object`);
          return;
        }
        const f = field as Record<string, unknown>;
        if (!f.id || typeof f.id !== 'string') {
          errors.push(`rounds.fields[${idx}].id is required`);
        }
        if (!f.label || typeof f.label !== 'string') {
          errors.push(`rounds.fields[${idx}].label is required`);
        }
        if (!['number', 'boolean', 'select', 'multi-select'].includes(f.type as string)) {
          errors.push(`rounds.fields[${idx}].type must be number, boolean, select, or multi-select`);
        }
        if (typeof f.perPlayer !== 'boolean') {
          errors.push(`rounds.fields[${idx}].perPlayer must be a boolean`);
        }
      });
    }
  }

  // Validate scoring
  if (!d.scoring || typeof d.scoring !== 'object') {
    errors.push('Missing or invalid scoring');
  } else {
    const scoring = d.scoring as Record<string, unknown>;
    if (!Array.isArray(scoring.formulas) || scoring.formulas.length === 0) {
      errors.push('scoring.formulas must be a non-empty array');
    }
  }

  // Validate win condition
  if (!d.winCondition || typeof d.winCondition !== 'object') {
    errors.push('Missing or invalid winCondition');
  } else {
    const wc = d.winCondition as Record<string, unknown>;
    if (!['highest-score', 'first-to-target', 'custom'].includes(wc.type as string)) {
      errors.push('winCondition.type must be highest-score, first-to-target, or custom');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate game rules
 */
export function validateGameRules(rules: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof rules !== 'object' || rules === null) {
    return { isValid: false, errors: ['Rules must be an object'] };
  }

  const r = rules as Record<string, unknown>;

  if (!r.overview || typeof r.overview !== 'string') {
    errors.push('Missing or invalid overview');
  }
  if (!Array.isArray(r.setup)) {
    errors.push('setup must be an array');
  }
  if (!Array.isArray(r.gameplay)) {
    errors.push('gameplay must be an array');
  }
  if (!Array.isArray(r.scoring)) {
    errors.push('scoring must be an array');
  }
  if (!r.winning || typeof r.winning !== 'string') {
    errors.push('Missing or invalid winning');
  }
  if (!r.fullRules || typeof r.fullRules !== 'object') {
    errors.push('Missing or invalid fullRules');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate complete game generation output
 */
export function validateCompleteGame(output: {
  summary: unknown;
  definition: unknown;
  rules: unknown;
}): ValidationResult {
  const allErrors: string[] = [];

  const summaryValidation = validateGameSummary(output.summary);
  if (!summaryValidation.isValid) {
    allErrors.push(...summaryValidation.errors.map(e => `Summary: ${e}`));
  }

  const definitionValidation = validateGameDefinition(output.definition);
  if (!definitionValidation.isValid) {
    allErrors.push(...definitionValidation.errors.map(e => `Definition: ${e}`));
  }

  const rulesValidation = validateGameRules(output.rules);
  if (!rulesValidation.isValid) {
    allErrors.push(...rulesValidation.errors.map(e => `Rules: ${e}`));
  }

  return { isValid: allErrors.length === 0, errors: allErrors };
}
