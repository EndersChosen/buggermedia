import { useEffect, useState } from 'react';
import { SKGameSession, SKRound, SKBonusDetails } from '@/@types/game.types';
import { useGame } from '@/context/GameContext';
import { calculateSKRoundScore } from './skCalculations';

export function useSKGame(gameId: string) {
  const { currentGame, updateGame, completeGame } = useGame();
  const [game, setGame] = useState<SKGameSession | null>(null);

  useEffect(() => {
    if (currentGame && currentGame.id === gameId && currentGame.gameType === 'skull-king') {
      setGame(currentGame);
    }
  }, [currentGame, gameId]);

  const addRound = (
    bids: Record<string, number>,
    tricks: Record<string, number>,
    bonuses: Record<string, number>,
    bonusDetails: Record<string, SKBonusDetails>
  ) => {
    if (!game) return;

    const roundNumber = game.currentRound;

    // Calculate scores for this round
    const scores: Record<string, number> = {};
    game.players.forEach((player) => {
      scores[player.id] = calculateSKRoundScore({
        bid: bids[player.id] || 0,
        tricks: tricks[player.id] || 0,
        bonusPoints: bonuses[player.id] || 0,
        roundNumber,
      });
    });

    const newRound: SKRound = {
      roundNumber,
      bids,
      tricks,
      bonuses,
      bonusDetails,
      scores,
    };

    const newTotalScores = { ...game.totalScores };
    Object.keys(scores).forEach((playerId) => {
      newTotalScores[playerId] = (newTotalScores[playerId] || 0) + scores[playerId];
    });

    const nextRound = roundNumber < 10 ? roundNumber + 1 : 10;

    updateGame(gameId, {
      rounds: [...game.rounds, newRound],
      totalScores: newTotalScores,
      currentRound: nextRound,
    });
  };

  const updateRound = (
    roundNumber: number,
    bids: Record<string, number>,
    tricks: Record<string, number>,
    bonuses: Record<string, number>,
    bonusDetails: Record<string, SKBonusDetails>
  ) => {
    if (!game) return;

    // Recalculate scores for the updated round
    const scores: Record<string, number> = {};
    game.players.forEach((player) => {
      scores[player.id] = calculateSKRoundScore({
        bid: bids[player.id] || 0,
        tricks: tricks[player.id] || 0,
        bonusPoints: bonuses[player.id] || 0,
        roundNumber,
      });
    });

    const updatedRounds = game.rounds.map((round) =>
      round.roundNumber === roundNumber
        ? { ...round, bids, tricks, bonuses, bonusDetails, scores }
        : round
    );

    // Recalculate all totals
    const newTotalScores = Object.fromEntries(game.players.map((p) => [p.id, 0]));

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

  const isGameComplete = (): boolean => {
    return game ? game.rounds.length === 10 : false;
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
    isGameComplete,
    getWinner,
    endGame,
  };
}
