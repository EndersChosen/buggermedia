import { useState, useCallback } from 'react';
import { SpadesHand, SpadesGameState } from './spadesTypes';
import { recalculateAllScores } from './spadesCalculations';

export function useSpadesGame() {
  const [gameState, setGameState] = useState<SpadesGameState>({
    hands: [],
    totalScoreA: 0,
    totalScoreB: 0,
    bagsA: 0,
    bagsB: 0,
  });

  const addHand = useCallback(() => {
    setGameState((prev) => {
      const newHand: SpadesHand = {
        handNumber: prev.hands.length + 1,
        teamA: { bid: 0, tricks: 0, score: 0 },
        teamB: { bid: 0, tricks: 0, score: 0 },
      };

      return {
        ...prev,
        hands: [...prev.hands, newHand],
      };
    });
  }, []);

  const updateHand = useCallback((handNumber: number, team: 'A' | 'B', field: 'bid' | 'tricks', value: number) => {
    setGameState((prev) => {
      const updatedHands = prev.hands.map((hand) => {
        if (hand.handNumber !== handNumber) return hand;

        return {
          ...hand,
          [`team${team}`]: {
            ...hand[`team${team}`],
            [field]: value,
          },
        };
      });

      // Recalculate all scores
      const { totalScoreA, totalScoreB, bagsA, bagsB, handScores } = recalculateAllScores(updatedHands);

      // Update hand scores
      const handsWithScores = updatedHands.map((hand, index) => ({
        ...hand,
        teamA: {
          ...hand.teamA,
          score: handScores[index].teamA,
        },
        teamB: {
          ...hand.teamB,
          score: handScores[index].teamB,
        },
      }));

      return {
        hands: handsWithScores,
        totalScoreA,
        totalScoreB,
        bagsA,
        bagsB,
      };
    });
  }, []);

  return {
    gameState,
    addHand,
    updateHand,
  };
}
