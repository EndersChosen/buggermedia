'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  GameSession,
  GameType,
  Player,
  CYAGameSession,
  SKGameSession,
  CYAGameMode,
  STORAGE_KEYS,
} from '@/types/game.types';
import { DynamicGameSession, DynamicGameDefinition } from '@/lib/types/dynamic-game.types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface GameContextValue {
  currentGame: GameSession | null;
  activeGames: GameSession[];
  completedGames: GameSession[];

  createGame: (
    gameType: GameType,
    players: Player[],
    options?: CreateGameOptions
  ) => string;
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
  dynamicDefinition?: DynamicGameDefinition;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [activeGames, setActiveGames] = useLocalStorage<GameSession[]>(
    STORAGE_KEYS.ACTIVE_GAMES,
    []
  );
  const [completedGames, setCompletedGames] = useLocalStorage<GameSession[]>(
    STORAGE_KEYS.COMPLETED_GAMES,
    []
  );
  const [currentGame, setCurrentGame] = useState<GameSession | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      } else {
        // Dynamic AI-generated game
        if (!options?.dynamicDefinition) {
          throw new Error(`Dynamic game type "${gameType}" requires a dynamicDefinition in options`);
        }

        const now = new Date();
        newGame = {
          id: gameId,
          gameType,
          players,
          currentRound: 1,
          rounds: [],
          totalScores: Object.fromEntries(players.map((p) => [p.id, 0])),
          dynamicDefinition: options.dynamicDefinition,
          status: 'setup',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          lastModified: now,
          startTime: now,
          isComplete: false,
        } as DynamicGameSession;
      }

      setActiveGames((prev) => [...prev, newGame]);
      setCurrentGame(newGame);
      return gameId;
    },
    [setActiveGames]
  );

  const loadGame = useCallback(
    (gameId: string) => {
      const game = activeGames.find((g) => g.id === gameId);
      if (game) {
        setCurrentGame(game);
      }
    },
    [activeGames]
  );

  const updateGame = useCallback(
    (gameId: string, updates: Partial<GameSession>) => {
      const updatedGames = activeGames.map((game) =>
        game.id === gameId
          ? ({ ...game, ...updates, lastModified: new Date() } as GameSession)
          : game
      );

      setActiveGames(updatedGames);

      if (currentGame?.id === gameId) {
        const updatedGame = updatedGames.find((g) => g.id === gameId);
        if (updatedGame) {
          setCurrentGame(updatedGame);
        }
      }
    },
    [activeGames, currentGame, setActiveGames]
  );

  const completeGame = useCallback(
    (gameId: string) => {
      const game = activeGames.find((g) => g.id === gameId);
      if (game) {
        const completedGame = { ...game, isComplete: true, lastModified: new Date() };
        setCompletedGames((prev) => [...prev, completedGame]);
        setActiveGames((prev) => prev.filter((g) => g.id !== gameId));
        setCurrentGame(null);
      }
    },
    [activeGames, setActiveGames, setCompletedGames]
  );

  const deleteGame = useCallback(
    (gameId: string) => {
      setActiveGames((prev) => prev.filter((g) => g.id !== gameId));
      setCompletedGames((prev) => prev.filter((g) => g.id !== gameId));

      if (currentGame?.id === gameId) {
        setCurrentGame(null);
      }
    },
    [currentGame, setActiveGames, setCompletedGames]
  );

  const clearCurrentGame = useCallback(() => {
    setCurrentGame(null);
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

    setCompletedGames((prev) =>
      prev.filter((game) => new Date(game.lastModified) > thirtyDaysAgo)
    );
  }, [setCompletedGames]);

  // Prevent hydration mismatch by not rendering until mounted
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
