import { DynamicGameDefinition } from '@/lib/types/dynamic-game.types';

export interface ValidationIssue {
  field: string;
  issue: string;
  question: string;
  type: 'number' | 'text' | 'select';
  options?: string[];
  defaultValue?: any;
}

export interface GameValidationResult {
  isComplete: boolean;
  issues: ValidationIssue[];
}

/**
 * Validates a game definition and identifies missing or incomplete data
 */
export function validateGameDefinition(definition: DynamicGameDefinition): GameValidationResult {
  const issues: ValidationIssue[] = [];

  // Check metadata
  if (!definition.metadata) {
    issues.push({
      field: 'metadata',
      issue: 'Missing metadata',
      question: 'Please provide game metadata',
      type: 'text',
    });
  } else {
    // Check min/max players
    if (typeof definition.metadata.minPlayers !== 'number' || definition.metadata.minPlayers < 1) {
      issues.push({
        field: 'metadata.minPlayers',
        issue: 'Minimum players not specified or invalid',
        question: 'What is the minimum number of players?',
        type: 'number',
        defaultValue: 2,
      });
    }

    if (typeof definition.metadata.maxPlayers !== 'number' || definition.metadata.maxPlayers < 1) {
      issues.push({
        field: 'metadata.maxPlayers',
        issue: 'Maximum players not specified or invalid',
        question: 'What is the maximum number of players?',
        type: 'number',
        defaultValue: 6,
      });
    }

    // Check that max >= min
    if (
      typeof definition.metadata.minPlayers === 'number' &&
      typeof definition.metadata.maxPlayers === 'number' &&
      definition.metadata.maxPlayers < definition.metadata.minPlayers
    ) {
      issues.push({
        field: 'metadata.maxPlayers',
        issue: 'Maximum players must be greater than or equal to minimum players',
        question: 'Maximum players cannot be less than minimum players. Please correct.',
        type: 'number',
        defaultValue: definition.metadata.minPlayers,
      });
    }

    // Check name and description
    if (!definition.metadata.name || definition.metadata.name.trim().length === 0) {
      issues.push({
        field: 'metadata.name',
        issue: 'Game name is missing',
        question: 'What is the name of this game?',
        type: 'text',
      });
    }

    if (!definition.metadata.description || definition.metadata.description.trim().length === 0) {
      issues.push({
        field: 'metadata.description',
        issue: 'Game description is missing',
        question: 'Please provide a brief description of the game',
        type: 'text',
      });
    }
  }

  // Check rounds structure
  if (!definition.rounds) {
    issues.push({
      field: 'rounds',
      issue: 'Round structure not defined',
      question: 'How many rounds are in the game?',
      type: 'select',
      options: ['Fixed number', 'Variable/Until condition met'],
    });
  } else {
    // Check round type
    if (!definition.rounds.type || !['fixed', 'variable'].includes(definition.rounds.type)) {
      issues.push({
        field: 'rounds.type',
        issue: 'Round type not specified',
        question: 'Does the game have a fixed number of rounds or variable?',
        type: 'select',
        options: ['fixed', 'variable'],
        defaultValue: 'fixed',
      });
    }

    // If fixed, check count
    if (definition.rounds.type === 'fixed' && typeof definition.rounds.count !== 'number') {
      issues.push({
        field: 'rounds.count',
        issue: 'Number of rounds not specified',
        question: 'How many rounds are in the game?',
        type: 'number',
        defaultValue: 10,
      });
    }

    // Check if fields exist
    if (!definition.rounds.fields || definition.rounds.fields.length === 0) {
      issues.push({
        field: 'rounds.fields',
        issue: 'No round fields defined',
        question: 'What data needs to be tracked each round? (This requires manual definition)',
        type: 'text',
      });
    }
  }

  // Check win condition
  if (!definition.winCondition) {
    issues.push({
      field: 'winCondition',
      issue: 'Win condition not defined',
      question: 'How does a player win the game?',
      type: 'select',
      options: ['Highest score', 'First to reach target', 'Lowest score', 'Custom condition'],
      defaultValue: 'highest-score',
    });
  } else {
    if (!definition.winCondition.type) {
      issues.push({
        field: 'winCondition.type',
        issue: 'Win condition type not specified',
        question: 'What type of win condition?',
        type: 'select',
        options: ['highest-score', 'first-to-target', 'lowest-score', 'custom'],
        defaultValue: 'highest-score',
      });
    }

    // If first-to-target, check for target
    if (
      definition.winCondition.type === 'first-to-target' &&
      !definition.winCondition.targetScore
    ) {
      issues.push({
        field: 'winCondition.targetScore',
        issue: 'Target score not specified',
        question: 'What score must players reach to win?',
        type: 'number',
        defaultValue: 100,
      });
    }
  }

  // Check scoring
  if (!definition.scoring || !definition.scoring.formulas || definition.scoring.formulas.length === 0) {
    issues.push({
      field: 'scoring.formulas',
      issue: 'Scoring formulas not defined',
      question: 'How are scores calculated? (This requires manual definition)',
      type: 'text',
    });
  }

  return {
    isComplete: issues.length === 0,
    issues,
  };
}

/**
 * Applies user corrections to a game definition
 */
export function applyCorrections(
  definition: DynamicGameDefinition,
  corrections: Record<string, any>
): DynamicGameDefinition {
  const updated = { ...definition };

  Object.entries(corrections).forEach(([field, value]) => {
    const parts = field.split('.');
    let current: any = updated;

    // Navigate to the nested field
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    // Set the value
    current[parts[parts.length - 1]] = value;
  });

  return updated;
}
