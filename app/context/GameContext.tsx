'use client';

import React, { createContext, useContext, useState, useCallback, useSyncExternalStore } from 'react';
import {
  GameSession,
  GameType,
  Player,
  CYAGameSession,
  SKGameSession,
  SpadesGameSession,
  ScoreCardSession,
  CYAGameMode,
  STORAGE_KEYS,
} from '@/types/game.types';
import type { ScoreCard } from '@/lib/scorecard/schema';
import { emptyPlayerValues } from '@/lib/scorecard/engine';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface GameContextValue {
  currentGame: GameSession | null;
  activeGames: GameSession[];
  completedGames: GameSession[];

  createGame: (gameType: GameType, players: Player[], options?: CreateGameOptions) => string;
  loadGame: (gameId: string) => void;
  updateGame: (gameId: string, updates: Partial<GameSession>) => void;
  completeGame: (gameId: string) => void;
  deleteGame: (gameId: string) => void;
  clearCurrentGame: () => void;
  exportData: () => void;
  cleanupOldGames: () => void;
}

interface CreateGameOptions {
  targetScore?: number;
  gameMode?: CYAGameMode;
  /** Score card for AI-generated or custom games. */
  card?: ScoreCard;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

const subscribeNoop = () => () => {};

export function GameProvider({ children }: { children: React.ReactNode }) {
  // Render nothing on the server / first client pass so localStorage-backed
  // state never causes a hydration mismatch.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const [activeGames, setActiveGames] = useLocalStorage<GameSession[]>(STORAGE_KEYS.ACTIVE_GAMES, []);
  const [completedGames, setCompletedGames] = useLocalStorage<GameSession[]>(STORAGE_KEYS.COMPLETED_GAMES, []);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  const currentGame = currentGameId ? activeGames.find((g) => g.id === currentGameId) ?? null : null;

  const createGame = useCallback(
    (gameType: GameType, players: Player[], options?: CreateGameOptions): string => {
      const gameId = crypto.randomUUID();
      const baseGame = {
        id: gameId,
        gameType,
        players,
        startTime: new Date(),
        lastModified: new Date(),
        isComplete: false,
      };

      let newGame: GameSession;

      if (gameType === 'cover-your-assets') {
        newGame = {
          ...baseGame,
          gameType: 'cover-your-assets',
          rounds: [],
          totalScores: Object.fromEntries(players.map((p) => [p.id, 0])),
          targetScore: options?.targetScore || 1000000,
          gameMode: options?.gameMode || 'classic',
        } as CYAGameSession;
      } else if (gameType === 'skull-king') {
        newGame = {
          ...baseGame,
          gameType: 'skull-king',
          rounds: [],
          totalScores: Object.fromEntries(players.map((p) => [p.id, 0])),
          currentRound: 1,
        } as SKGameSession;
      } else if (gameType === 'spades') {
        newGame = {
          ...baseGame,
          gameType: 'spades',
          hands: [],
          totalScoreA: 0,
          totalScoreB: 0,
          bagsA: 0,
          bagsB: 0,
        } as SpadesGameSession;
      } else {
        if (!options?.card) {
          throw new Error(`Game type "${gameType}" needs a score card`);
        }
        newGame = {
          ...baseGame,
          kind: 'scorecard',
          card: options.card,
          rounds: [],
          sheet: emptyPlayerValues(options.card, players),
          draft: null,
        } as ScoreCardSession;
      }

      setActiveGames((prev) => [...prev, newGame]);
      setCurrentGameId(gameId);
      return gameId;
    },
    [setActiveGames]
  );

  const loadGame = useCallback((gameId: string) => {
    setCurrentGameId(gameId);
  }, []);

  const updateGame = useCallback(
    (gameId: string, updates: Partial<GameSession>) => {
      setActiveGames((prev) =>
        prev.map((game) =>
          game.id === gameId ? ({ ...game, ...updates, lastModified: new Date() } as GameSession) : game
        )
      );
    },
    [setActiveGames]
  );

  const completeGame = useCallback(
    (gameId: string) => {
      const game = activeGames.find((g) => g.id === gameId);
      if (game) {
        const completedGame = { ...game, isComplete: true, lastModified: new Date() } as GameSession;
        setCompletedGames((prev) => [...prev.filter((g) => g.id !== gameId), completedGame]);
        setActiveGames((prev) => prev.filter((g) => g.id !== gameId));
        setCurrentGameId(null);
      }
    },
    [activeGames, setActiveGames, setCompletedGames]
  );

  const deleteGame = useCallback(
    (gameId: string) => {
      setActiveGames((prev) => prev.filter((g) => g.id !== gameId));
      setCompletedGames((prev) => prev.filter((g) => g.id !== gameId));
      setCurrentGameId((id) => (id === gameId ? null : id));
    },
    [setActiveGames, setCompletedGames]
  );

  const clearCurrentGame = useCallback(() => {
    setCurrentGameId(null);
  }, []);

  const exportData = useCallback(() => {
    const data = {
      activeGames,
      completedGames,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `cardgames-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeGames, completedGames]);

  const cleanupOldGames = useCallback(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    setCompletedGames((prev) => prev.filter((game) => new Date(game.lastModified) > thirtyDaysAgo));
  }, [setCompletedGames]);

  if (!mounted) {
    return null;
  }

  return (
    <GameContext.Provider
      value={{
        currentGame,
        activeGames,
        completedGames,
        createGame,
        loadGame,
        updateGame,
        completeGame,
        deleteGame,
        clearCurrentGame,
        exportData,
        cleanupOldGames,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
