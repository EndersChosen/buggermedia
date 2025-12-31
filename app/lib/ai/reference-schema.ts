/**
 * Reference schema showing the expected structure for AI-generated games
 * Based on Skull King as an example
 */
export const REFERENCE_GAME_SCHEMA = {
  metadata: {
    name: "Skull King",
    description: "A trick-taking game where players bid on the number of tricks they'll win each round",
    minPlayers: 2,
    maxPlayers: 6,
  },
  rounds: {
    type: "fixed",
    maxRounds: 10,
    fields: [
      {
        id: "bid",
        label: "Bid",
        type: "number",
        perPlayer: true,
        validation: {
          min: 0,
          maxExpression: "currentRound", // Max bid equals current round number
          required: true,
        },
        helperText: "Number of tricks you predict you'll win",
      },
      {
        id: "tricks",
        label: "Tricks Won",
        type: "number",
        perPlayer: true,
        validation: {
          min: 0,
          maxExpression: "currentRound",
          sum: "currentRound", // Total tricks must equal round number
          required: true,
        },
        helperText: "Actual number of tricks won",
      },
      {
        id: "bonusPoints",
        label: "Bonus Points",
        type: "number",
        perPlayer: true,
        validation: {
          min: 0,
          required: false,
        },
        helperText: "Points from special cards (Kraken, Mermaids, etc.)",
      },
      {
        id: "capturedSkullKing",
        label: "Captured Skull King",
        type: "boolean",
        perPlayer: true,
        validation: {
          required: false,
        },
        helperText: "Did you capture the Skull King with a Pirate?",
      },
      {
        id: "skullKingCapturedByMermaid",
        label: "Skull King Captured by Mermaid",
        type: "boolean",
        perPlayer: true,
        validation: {
          required: false,
        },
        helperText: "Was your Skull King captured by a Mermaid?",
      },
    ],
  },
  scoring: {
    formulas: [
      {
        name: "bidSuccess",
        expression: `
          if (bid === 0 && tricks === 0) {
            return currentRound * 10;
          } else if (bid === tricks) {
            return bid * 20;
          } else {
            return -Math.abs(bid - tricks) * 10;
          }
        `,
        variables: ["bid", "tricks", "currentRound"],
        scope: "per-round",
      },
      {
        name: "bonuses",
        expression: "bonusPoints + (capturedSkullKing ? 30 : 0) - (skullKingCapturedByMermaid ? 30 : 0)",
        variables: ["bonusPoints", "capturedSkullKing", "skullKingCapturedByMermaid"],
        scope: "per-round",
      },
      {
        name: "total",
        expression: "bidSuccess + bonuses",
        variables: ["bidSuccess", "bonuses"],
        scope: "per-round",
      },
    ],
  },
  winCondition: {
    type: "highest-score",
    description: "Player with highest total score after 10 rounds wins",
  },
};

/**
 * Get reference schema as formatted JSON string for AI prompts
 */
export function getReferenceSchemaString(): string {
  return JSON.stringify(REFERENCE_GAME_SCHEMA, null, 2);
}
