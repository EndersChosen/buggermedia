interface SKScoreParams {
  bid: number;
  tricks: number;
  bonusPoints: number;
  roundNumber: number;
}

/**
 * Calculate the score for a single round of Skull King
 */
export function calculateSKRoundScore({
  bid,
  tricks,
  bonusPoints,
  roundNumber,
}: SKScoreParams): number {
  // Zero bid handling
  if (bid === 0) {
    if (tricks === 0) {
      // Success: 10 points × cards dealt this round + any special bonuses (e.g., Loot alliance)
      return roundNumber * 10 + bonusPoints;
    } else {
      // Failure: -10 points × cards dealt this round (bonuses not counted)
      return -(roundNumber * 10);
    }
  }

  // Regular bid handling
  if (bid === tricks) {
    // Success: 20 points per trick + any special bonuses
    return bid * 20 + bonusPoints;
  } else {
    // Failure: -10 points per difference (bonuses not counted)
    const difference = Math.abs(bid - tricks);
    return -(difference * 10);
  }
}

interface BonusData {
  pirates: number; // Pirates that captured Mermaids (20 pts each)
  skullKing: number; // Skull King capturing Mermaid (40 pts each)
  capturedSkullKing: number; // Pirate capturing Skull King (30 pts each)
}

/**
 * Calculate bonus points from special card captures
 */
export function calculateBonusPoints(bonusData: BonusData): number {
  let total = 0;
  total += bonusData.pirates * 20; // Pirate captures Mermaid
  total += bonusData.skullKing * 40; // Skull King captures Mermaid
  total += bonusData.capturedSkullKing * 30; // Pirate captures Skull King
  return total;
}

/**
 * Get the number of cards dealt in a given round
 */
export function getCardsForRound(roundNumber: number): number {
  return roundNumber; // Round 1 = 1 card, Round 2 = 2 cards, etc.
}

/**
 * Check if a bid is valid for the current round
 */
export function isValidBid(bid: number, roundNumber: number): boolean {
  return bid >= 0 && bid <= roundNumber;
}
