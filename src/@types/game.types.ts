// Base types
export type GameType = 'cover-your-assets' | 'skull-king';

export interface Player {
  id: string;
  name: string;
}

// Game session base
export interface BaseGameSession {
  id: string;
  gameType: GameType;
  players: Player[];
  startTime: Date;
  lastModified: Date;
  isComplete: boolean;
}

// Cover Your Assets specific
export interface CYARound {
  roundNumber: number;
  scores: Record<string, number>; // playerId -> score for this round
}

export type CYAGameMode = 'classic' | 'quick' | 'bestOf3';

export interface CYAGameSession extends BaseGameSession {
  gameType: 'cover-your-assets';
  rounds: CYARound[];
  totalScores: Record<string, number>; // playerId -> cumulative score
  targetScore: number; // 1000000 for classic, configurable
  gameMode: CYAGameMode;
}

// Skull King specific
export interface SKRound {
  roundNumber: number; // 1-10
  bids: Record<string, number>; // playerId -> bid
  tricks: Record<string, number>; // playerId -> tricks won
  bonuses: Record<string, number>; // playerId -> bonus points
  scores: Record<string, number>; // playerId -> score for this round
}

export interface SKGameSession extends BaseGameSession {
  gameType: 'skull-king';
  rounds: SKRound[];
  totalScores: Record<string, number>; // playerId -> cumulative score
  currentRound: number; // 1-10
}

export type GameSession = CYAGameSession | SKGameSession;

// Game registry
export interface GameDefinition {
  id: GameType;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  imageUrl?: string;
  rules: GameRules;
}

export interface RuleSection {
  id: string;
  title: string;
  content: string;
  subsections?: RuleSection[];
}

export interface GameRules {
  overview: string;
  setup: string[];
  gameplay: string[];
  scoring: string[];
  winning: string;
  // Enhanced rules with full content
  fullRules?: {
    sections: RuleSection[];
  };
}

// LocalStorage schema
export interface StorageData {
  active: GameSession[];
  completed: GameSession[];
  settings: {
    darkMode: boolean;
    soundEnabled: boolean;
  };
}

// Storage keys
export const STORAGE_KEYS = {
  ACTIVE_GAMES: 'cardgames:active',
  COMPLETED_GAMES: 'cardgames:completed',
  SETTINGS: 'cardgames:settings'
} as const;
