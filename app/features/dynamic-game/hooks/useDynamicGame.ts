'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DynamicGameSession, DynamicGameDefinition, DynamicRoundData } from '@/lib/types/dynamic-game.types';
import { checkWinCondition } from '@/lib/engines/win-conditions';
import { useGamePersistence } from '@/hooks/useGamePersistence';

export function useDynamicGame(gameId: string, gameSlug: string, definition: DynamicGameDefinition) {
  const [game, setGame] = useGamePersistence<DynamicGameSession>(gameId);
  const [isAddingRound, setIsAddingRound] = useState(false);

  // Initialize game if not exists
  useEffect(() => {
    if (!game && definition) {
      const now = new Date();
      const initialGame: DynamicGameSession = {
        id: gameId,
        gameType: gameSlug,
        players: [],
        currentRound: 1,
        rounds: [],
        totalScores: {},
        dynamicDefinition: definition,
        status: 'setup',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        lastModified: now,
        startTime: now,
        isComplete: false,
      };
      setGame(initialGame);
    }
  }, [game, gameId, gameSlug, definition, setGame]);

  const addPlayer = useCallback(
    (name: string) => {
      if (!game) return;

      const newPlayer = {
        id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
      };

      const now = new Date();
      setGame({
        ...game,
        players: [...game.players, newPlayer],
        totalScores: {
          ...game.totalScores,
          [newPlayer.id]: 0,
        },
        updatedAt: now.toISOString(),
        lastModified: now,
      });
    },
    [game, setGame]
  );

  const removePlayer = useCallback(
    (playerId: string) => {
      if (!game) return;

      const now = new Date();
      setGame({
        ...game,
        players: game.players.filter((p) => p.id !== playerId),
        updatedAt: now.toISOString(),
        lastModified: now,
      });
    },
    [game, setGame]
  );

  const startGame = useCallback(() => {
    if (!game || game.players.length < (definition.metadata.minPlayers ?? 2)) return;

    const now = new Date();
    setGame({
      ...game,
      status: 'in-progress',
      currentRound: 1,
      updatedAt: now.toISOString(),
      lastModified: now,
    });
  }, [game, definition, setGame]);

  const submitRound = useCallback(
    (roundData: DynamicRoundData) => {
      if (!game) return;

      const updatedTotalScores = { ...game.totalScores };
      if (roundData.roundScores) {
        Object.entries(roundData.roundScores).forEach(([playerId, score]) => {
          updatedTotalScores[playerId] = (updatedTotalScores[playerId] ?? 0) + score;
        });
      }

      const updatedRounds = [...game.rounds, roundData];
      const nextRound = game.currentRound + 1;

      // Check win condition
      const winCheck = checkWinCondition(definition, {
        roundNumber: nextRound,
        playerIds: game.players.map((p) => p.id),
        currentRoundData: {},
        totalScores: updatedTotalScores,
        allRounds: updatedRounds,
      });

      const now = new Date();
      let updatedGame: DynamicGameSession = {
        ...game,
        rounds: updatedRounds,
        totalScores: updatedTotalScores,
        currentRound: nextRound,
        updatedAt: now.toISOString(),
        lastModified: now,
      };

      if (winCheck.isComplete) {
        updatedGame = {
          ...updatedGame,
          status: 'completed',
          isComplete: true,
          winner: winCheck.winner,
        };
      }

      setGame(updatedGame);
      setIsAddingRound(false);
    },
    [game, definition, setGame]
  );

  const resetGame = useCallback(() => {
    if (!game) return;

    const now = new Date();
    setGame({
      ...game,
      currentRound: 1,
      rounds: [],
      totalScores: game.players.reduce(
        (acc, player) => ({ ...acc, [player.id]: 0 }),
        {}
      ),
      status: 'in-progress',
      isComplete: false,
      winner: undefined,
      updatedAt: now.toISOString(),
      lastModified: now,
    });
  }, [game, setGame]);

  const deleteGame = useCallback(() => {
    setGame(null);
  }, [setGame]);

  return {
    game,
    isAddingRound,
    setIsAddingRound,
    addPlayer,
    removePlayer,
    startGame,
    submitRound,
    resetGame,
    deleteGame,
  };
}
