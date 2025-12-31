import { GameDefinition, GameType } from '@/types/game.types';
import { cyaRules } from '@/features/cover-your-assets/cyaRules';
import { skRules } from '@/features/skull-king/skRules';

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
};

export function getGameDefinition(gameType: GameType): GameDefinition {
  return GAME_REGISTRY[gameType];
}

export function getAllGames(): GameDefinition[] {
  return Object.values(GAME_REGISTRY);
}

/**
 * Fetches all games including AI-generated ones from the database
 */
export async function getAllGamesWithAI(): Promise<GameDefinition[]> {
  try {
    const response = await fetch('/api/games', {
      cache: 'no-store', // Don't cache so we always get latest games
    });

    if (!response.ok) {
      console.warn('Failed to fetch AI games, falling back to hardcoded only');
      return getAllGames();
    }

    const data = await response.json();
    return data.combined || getAllGames();
  } catch (error) {
    console.error('Error fetching games with AI:', error);
    return getAllGames();
  }
}
