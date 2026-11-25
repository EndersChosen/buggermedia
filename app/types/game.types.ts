import type { ScoreCard } from '@/lib/scorecard/schema';
import type { PlayerValues, RoundEntry } from '@/lib/scorecard/engine';

// Base types
export type HardcodedGameType = 'cover-your-assets' | 'skull-king' | 'spades';
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

// Spades specific
export interface SpadesHand {
  handNumber: number;
  teamA: { bid: number; tricks: number; score: number };
  teamB: { bid: number; tricks: number; score: number };
}

export interface SpadesGameSession extends BaseGameSession {
  gameType: 'spades';
  hands: SpadesHand[];
  totalScoreA: number;
  totalScoreB: number;
  bagsA: number;
  bagsB: number;
}

// AI-generated / custom score card games
export interface ScoreCardSession extends BaseGameSession {
  kind: 'scorecard';
  card: ScoreCard;
  /** Completed rounds (rounds layout). */
  rounds: RoundEntry[];
  /** Score sheet values (categories layout). */
  sheet: PlayerValues;
  /** Unsaved inputs for the round being entered (rounds layout). */
  draft?: PlayerValues | null;
}

/** Sessions saved by older versions of the app for AI games; kept so they can be listed and deleted. */
export interface LegacyDynamicSession extends BaseGameSession {
  kind?: undefined;
  dynamicDefinition?: { metadata?: { name?: string } } | null;
}

export type GameSession = CYAGameSession | SKGameSession | SpadesGameSession | ScoreCardSession | LegacyDynamicSession;

export function isScoreCardSession(game: GameSession | null | undefined): game is ScoreCardSession {
  return Boolean(game && (game as ScoreCardSession).kind === 'scorecard' && (game as ScoreCardSession).card);
}

// Game registry
export interface GameDefinition {
  id: GameType;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  imageUrl?: string;
  rules: GameRules;
  /** hardcoded = built-in tracker, ai-generated = shared library, custom = saved in this browser */
  source?: 'hardcoded' | 'ai-generated' | 'custom';
  /** Shared library entries made by the old HTML generator (no structured card). */
  legacy?: boolean;
  /** Visual theme id (see lib/themes). */
  theme?: string | null;
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
  SETTINGS: 'cardgames:settings',
  CUSTOM_CARDS: 'cardgames:customCards',
} as const;
