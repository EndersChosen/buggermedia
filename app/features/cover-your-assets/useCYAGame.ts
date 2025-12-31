'use client';

import { useEffect, useState } from 'react';
import { CYAGameSession, CYARound } from '@/types/game.types';
import { useGame } from '@/context/GameContext';

export function useCYAGame(gameId: string) {
  const { currentGame, updateGame, completeGame } = useGame();
  const [game, setGame] = useState<CYAGameSession | null>(null);

  useEffect(() => {
    if (currentGame && currentGame.id === gameId && currentGame.gameType === 'cover-your-assets') {
      setGame(currentGame as CYAGameSession);
    }
  }, [currentGame, gameId]);

  const addRound = (scores: Record<string, number>, cardCollections?: Record<string, Record<string, number>>) => {
    if (!game) return;

    const roundNumber = game.rounds.length + 1;
    const newRound: CYARound = {
      roundNumber,
      scores,
      cardCollections,
    };

    const newTotalScores = { ...game.totalScores };
    Object.keys(scores).forEach((playerId) => {
      newTotalScores[playerId] = (newTotalScores[playerId] || 0) + scores[playerId];
    });

    updateGame(gameId, {
      rounds: [...game.rounds, newRound],
      totalScores: newTotalScores,
    });
  };

  const updateRound = (roundNumber: number, scores: Record<string, number>, cardCollections?: Record<string, Record<string, number>>) => {
    if (!game) return;

    const updatedRounds = game.rounds.map((round) =>
      round.roundNumber === roundNumber ? { ...round, scores, cardCollections } : round
    );

    // Recalculate totals
    const newTotalScores = Object.fromEntries(
      game.players.map((p) => [p.id, 0])
    );

    updatedRounds.forEach((round) => {
      Object.keys(round.scores).forEach((playerId) => {
        newTotalScores[playerId] = (newTotalScores[playerId] || 0) + round.scores[playerId];
      });
    });

    updateGame(gameId, {
      rounds: updatedRounds,
      totalScores: newTotalScores,
    });
  };

  const checkWinCondition = (): boolean => {
    if (!game) return false;
    return Object.values(game.totalScores).some((score) => score >= game.targetScore);
  };

  const getWinner = () => {
    if (!game) return null;

    const maxScore = Math.max(...Object.values(game.totalScores));
    const winnerEntry = Object.entries(game.totalScores).find(
      ([_, score]) => score === maxScore
    );

    if (!winnerEntry) return null;

    const winner = game.players.find((p) => p.id === winnerEntry[0]);
    return winner ? { player: winner, score: maxScore } : null;
  };

  const endGame = () => {
    completeGame(gameId);
  };

  return {
    game,
    addRound,
    updateRound,
    checkWinCondition,
    getWinner,
    endGame,
  };
}
