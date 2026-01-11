// Spades game type definitions

export interface SpadesTeamData {
  bid: number;
  tricks: number;
  score: number;
}

export interface SpadesHand {
  handNumber: number;
  teamA: SpadesTeamData;
  teamB: SpadesTeamData;
}

export interface SpadesGameState {
  hands: SpadesHand[];
  totalScoreA: number;
  totalScoreB: number;
  bagsA: number;
  bagsB: number;
}

export interface TeamScoreResult {
  score: number;
  bags: number;
}
