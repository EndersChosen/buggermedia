import { TeamScoreResult } from './spadesTypes';

/**
 * Calculate score for a single team in a single hand
 * @param bid - Team's bid (0 for nil)
 * @param tricks - Actual tricks taken
 * @param currentBags - Current bag count before this hand
 * @returns Object with score and updated bag count
 */
export function scoreTeam(bid: number, tricks: number, currentBags: number): TeamScoreResult {
  let score = 0;
  let newBags = currentBags;

  // Nil bid (0)
  if (bid === 0) {
    if (tricks === 0) {
      score += 100; // Successful nil
    } else {
      score -= 100; // Failed nil
    }
  }
  // Regular bid
  else if (tricks >= bid) {
    // Made bid
    score += bid * 10;
    // Add overtricks (bags)
    const overtricks = tricks - bid;
    newBags += overtricks;
    score += overtricks; // Each bag is worth 1 point
  } else {
    // Failed to make bid
    score -= bid * 10;
  }

  // Check for bag penalty (every 10 bags = -100 points)
  if (newBags >= 10) {
    score -= 100;
    newBags -= 10;
  }

  return { score, bags: newBags };
}

/**
 * Recalculate all scores from scratch
 * Used when any hand data changes to ensure consistency
 */
export function recalculateAllScores(hands: Array<{
  teamA: { bid: number; tricks: number };
  teamB: { bid: number; tricks: number };
}>): {
  totalScoreA: number;
  totalScoreB: number;
  bagsA: number;
  bagsB: number;
  handScores: Array<{ teamA: number; teamB: number }>;
} {
  let totalScoreA = 0;
  let totalScoreB = 0;
  let bagsA = 0;
  let bagsB = 0;
  const handScores: Array<{ teamA: number; teamB: number }> = [];

  for (const hand of hands) {
    const resultA = scoreTeam(hand.teamA.bid, hand.teamA.tricks, bagsA);
    const resultB = scoreTeam(hand.teamB.bid, hand.teamB.tricks, bagsB);

    bagsA = resultA.bags;
    bagsB = resultB.bags;

    totalScoreA += resultA.score;
    totalScoreB += resultB.score;

    handScores.push({
      teamA: resultA.score,
      teamB: resultB.score,
    });
  }

  return { totalScoreA, totalScoreB, bagsA, bagsB, handScores };
}
