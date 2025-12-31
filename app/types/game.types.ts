import type { DynamicGameSession, DynamicGameDefinition } from '@/lib/types/dynamic-game.types';

// Base types
export type HardcodedGameType = 'cover-your-assets' | 'skull-king';
export type GameType = HardcodedGameType | string; // Support AI-generated games with dynamic slugs

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
  scores: Record<string, number>; // playerId -> score for this round (auto-calculated from cardCollections)
  cardCollections?: Record<string, Record<string, number>>; // playerId -> cardName -> quantity
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
export interface SKBonusDetails {
  yellow14: boolean;
  purple14: boolean;
  green14: boolean;
  black14: boolean;
  mermaidsCapturedByPirates: number;
  piratesCapturedBySkullKing: number;
  skullKingCapturedByMermaid: boolean;
  lootAlliances?: string[]; // Array of player IDs this player is allied with via Loot cards
}

export interface SKRound {
  roundNumber: number; // 1-10
  bids: Record<string, number>; // playerId -> bid
  tricks: Record<string, number>; // playerId -> tricks won
  bonuses: Record<string, number>; // playerId -> bonus points total
  bonusDetails?: Record<string, SKBonusDetails>; // playerId -> detailed bonus breakdown
  scores: Record<string, number>; // playerId -> score for this round
}

export interface SKGameSession extends BaseGameSession {
  gameType: 'skull-king';
  rounds: SKRound[];
  totalScores: Record<string, number>; // playerId -> cumulative score
  currentRound: number; // 1-10
}

export type GameSession = CYAGameSession | SKGameSession | DynamicGameSession;

// Game registry
export interface GameDefinition {
  id: GameType;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  imageUrl?: string;
  rules: GameRules;
  source?: 'hardcoded' | 'ai-generated'; // Track game origin
  dynamicDefinition?: DynamicGameDefinition; // For AI-generated games
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
