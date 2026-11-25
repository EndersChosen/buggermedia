import { GameDefinition, GameType } from '@/types/game.types';
import { cyaRules } from '@/features/cover-your-assets/cyaRules';
import { skRules } from '@/features/skull-king/skRules';
import { spadesRules } from '@/features/spades/spadesRules';

export const GAME_REGISTRY: Record<GameType, GameDefinition> = {
  'cover-your-assets': {
    id: 'cover-your-assets',
    name: 'Cover Your Assets',
    description: 'Race to become the first millionaire by collecting valuable asset pairs!',
    minPlayers: 2,
    maxPlayers: 8,
    rules: cyaRules,
  },
  'skull-king': {
    id: 'skull-king',
    name: 'Skull King',
    description: 'Predict your tricks accurately across 10 rounds to earn the highest score!',
    minPlayers: 2,
    maxPlayers: 8,
    rules: skRules,
  },
  'spades': {
    id: 'spades',
    name: 'Spades',
    description: 'A classic partnership trick-taking game. Bid wisely and avoid bags!',
    minPlayers: 4,
    maxPlayers: 4,
    rules: spadesRules,
  },
};

export function getGameDefinition(gameType: GameType): GameDefinition {
  return GAME_REGISTRY[gameType];
}

export function getAllGames(): GameDefinition[] {
  return Object.values(GAME_REGISTRY);
}

/**
 * Fetches built-in games plus the shared library of AI-generated games.
 * Never throws: falls back to built-in games with a warning.
 */
export async function getAllGamesWithAI(): Promise<{ games: GameDefinition[]; warning?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const response = await fetch('/api/games', { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      return { games: getAllGames(), warning: 'Shared games could not be loaded.' };
    }
    const data = await response.json();
    return { games: data.combined || getAllGames(), warning: data.warning };
  } catch {
    return { games: getAllGames(), warning: 'Shared games could not be loaded.' };
  }
}
