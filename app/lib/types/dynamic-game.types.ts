/**
 * Dynamic Game Type System
 *
 * This module defines the TypeScript interfaces for AI-generated games.
 * These types enable schema-driven UI rendering and game logic execution.
 */

// ============================================================================
// Field Definitions
// ============================================================================

export type FieldType = 'number' | 'boolean' | 'select' | 'multi-select' | 'text';

export interface FieldValidation {
  /** Minimum numeric value */
  min?: number;

  /** Maximum numeric value */
  max?: number;

  /** JavaScript expression for dynamic max (e.g., "currentRound") */
  maxExpression?: string;

  /** Sum of all player values must equal this number */
  sum?: number;

  /** JavaScript expression for sum validation (e.g., "sum <= currentRound") */
  sumExpression?: string;

  /** Whether the field is required */
  required?: boolean;
}

export interface RoundField {
  /** Unique identifier for this field */
  id: string;

  /** Display label */
  label: string;

  /** Field input type */
  type: FieldType;

  /** If true, one instance per player. If false, one instance per round. */
  perPlayer: boolean;

  /** Validation rules */
  validation?: FieldValidation;

  /** Options for select/multi-select fields */
  options?: string[];

  /** Helper text displayed below the field */
  helperText?: string;

  /** Default value */
  defaultValue?: any;

  /** Whether this field should be visible */
  visible?: boolean | string; // Can be boolean or expression
}

// ============================================================================
// Scoring System
// ============================================================================

export type ScoringScope = 'per-round' | 'cumulative' | 'final';

export interface ScoringFormula {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** JavaScript expression to evaluate */
  expression: string;

  /** Field IDs referenced in the expression */
  variables: string[];

  /** When this formula is calculated */
  scope: ScoringScope;

  /** Description of what this formula calculates */
  description?: string;
}

// ============================================================================
// Validation Rules
// ============================================================================

export interface ValidationRule {
  /** Unique identifier */
  id: string;

  /** Field ID this rule applies to */
  field: string;

  /** JavaScript boolean expression */
  rule: string;

  /** Error message to display if rule fails */
  errorMessage: string;

  /** Severity level */
  severity?: 'error' | 'warning';
}

// ============================================================================
// Win Conditions
// ============================================================================

export type WinConditionType = 'highest-score' | 'lowest-score' | 'first-to-target' | 'custom';

export interface WinCondition {
  type: WinConditionType;

  /** Target score for 'first-to-target' type */
  targetScore?: number;

  /** Custom JavaScript expression for win check */
  customExpression?: string;

  /** Description of how to win */
  description: string;
}

// ============================================================================
// Round Structure
// ============================================================================

export interface RoundDefinition {
  /** Type of round structure */
  type: 'fixed' | 'variable' | 'infinite';

  /** Number of rounds (for 'fixed' type) */
  count?: number;

  /** Expression to calculate round count (for 'variable' type) */
  countExpression?: string;

  /** Fields that appear in each round */
  fields: RoundField[];

  /** Whether rounds are numbered starting from 1 */
  numbered?: boolean;

  /** Custom round labels (e.g., ["Opening", "Middle", "Endgame"]) */
  customLabels?: string[];
}

// ============================================================================
// UI Configuration
// ============================================================================

export interface UIComponent {
  /** Component type */
  type: 'score-input' | 'score-board' | 'round-tracker' | 'player-stats';

  /** Display configuration */
  config: Record<string, any>;
}

export interface UIConfiguration {
  /** Components to render */
  components: UIComponent[];

  /** Color theme */
  theme?: {
    primary?: string;
    secondary?: string;
  };

  /** Layout preferences */
  layout?: {
    scoreboardColumns?: string[];
    compactMode?: boolean;
  };
}

// ============================================================================
// Complete Game Definition
// ============================================================================

export interface DynamicGameDefinition {
  /** Round structure and fields */
  rounds: RoundDefinition;

  /** Scoring formulas */
  scoring: {
    formulas: ScoringFormula[];
  };

  /** Validation rules */
  validation: {
    rules: ValidationRule[];
  };

  /** UI configuration */
  ui: UIConfiguration;

  /** Win condition */
  winCondition: WinCondition;

  /** Game metadata */
  metadata: {
    version: number;
    generatedBy: 'ai' | 'manual';
    generatedAt?: string;
  };
}

// ============================================================================
// Runtime Game State
// ============================================================================

export interface DynamicRoundData {
  /** Round number (1-indexed) */
  roundNumber: number;

  /** Field values: { fieldId: value or { playerId: value } } */
  fields: Record<string, any>;

  /** Calculated scores per player for this round */
  roundScores?: Record<string, number>;

  /** Timestamp */
  timestamp?: string;
}

export interface DynamicGameSession {
  /** Session ID */
  id: string;

  /** Game type slug (e.g., 'yahtzee-ai') */
  gameType: string;

  /** Player IDs and names */
  players: Array<{ id: string; name: string }>;

  /** Current round number */
  currentRound: number;

  /** All round data */
  rounds: DynamicRoundData[];

  /** Cumulative scores */
  totalScores: Record<string, number>;

  /** Game definition */
  dynamicDefinition: DynamicGameDefinition;

  /** Game status */
  status: 'setup' | 'in-progress' | 'completed';

  /** Winner (if completed) */
  winner?: { playerId: string; score: number };

  /** Created timestamp */
  createdAt: string;

  /** Last updated timestamp */
  updatedAt: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export interface EvaluationContext {
  /** Current round number */
  currentRound: number;

  /** Total rounds (if fixed) */
  totalRounds?: number;

  /** Current round data */
  roundData: Record<string, any>;

  /** All rounds data */
  allRounds: DynamicRoundData[];

  /** Player IDs */
  playerIds: string[];

  /** Current player ID (for per-player calculations) */
  currentPlayerId?: string;

  /** Cumulative scores */
  totalScores: Record<string, number>;
}

export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;

  /** Validation errors */
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

export interface ScoringResult {
  /** Scores calculated for this evaluation */
  scores: Record<string, number>;

  /** Updated cumulative totals */
  updatedTotals: Record<string, number>;

  /** Any errors during calculation */
  errors?: string[];
}
