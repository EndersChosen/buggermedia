'use client';

import { useLocalStorage } from './useLocalStorage';
import type { GameSession } from '@/types/game.types';

/**
 * Hook for persisting game sessions to localStorage
 * Wraps useLocalStorage with a game-specific key pattern
 */
export function useGamePersistence<T extends GameSession>(gameId: string) {
  const key = `game_${gameId}`;
  return useLocalStorage<T | null>(key, null);
}
