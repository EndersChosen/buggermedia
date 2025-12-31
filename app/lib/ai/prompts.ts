/**
 * Stage 1: Extract game summary from PDF text
 */
export const SUMMARY_PROMPT = `You are an expert at analyzing card game rulebooks. Extract a structured summary from the following rulebook.

IMPORTANT: Respond ONLY with valid JSON. No markdown formatting, no code blocks, no explanation text - just the JSON object.

Required JSON structure:
{
  "gameName": "string",
  "overview": "string (2-3 sentences)",
  "minPlayers": number,
  "maxPlayers": number,
  "rounds": {
    "type": "fixed" | "variable",
    "count": number (or null if variable)
  },
  "winCondition": "string (how to win)",
  "scoringOverview": "string (brief description of scoring)"
}

Rulebook text:
{{PDF_TEXT}}`;

/**
 * Stage 2: Generate full game definition
 */
export function getDefinitionPrompt(summary: string, referenceSchema: string): string {
  return `You are an expert at designing score tracking systems for card games. Generate a complete, playable game definition.

GAME SUMMARY:
${summary}

REFERENCE SCHEMA (for structure guidance):
${referenceSchema}

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation - just the JSON.

Generate a game definition with this structure:
{
  "metadata": {
    "name": "string",
    "description": "string",
    "minPlayers": number,
    "maxPlayers": number
  },
  "rounds": {
    "type": "fixed" | "variable",
    "maxRounds": number,
    "fields": [
      {
        "id": "string (camelCase)",
        "label": "string",
        "type": "number" | "boolean" | "select" | "multi-select",
        "perPlayer": boolean,
        "validation": {
          "min": number (optional),
          "max": number (optional),
          "maxExpression": "string (optional, e.g. 'currentRound')",
          "sum": number (optional),
          "required": boolean
        },
        "options": ["string"] (only for select types),
        "helperText": "string (optional)"
      }
    ]
  },
  "scoring": {
    "formulas": [
      {
        "name": "string",
        "expression": "string (JavaScript expression)",
        "variables": ["string (field IDs)"],
        "scope": "per-round" | "cumulative"
      }
    ]
  },
  "winCondition": {
    "type": "highest-score" | "first-to-target" | "custom",
    "target": number (optional),
    "expression": "string (optional, for custom)"
  }
}

GUIDELINES:
- Create fields for ALL tracked values (bids, tricks, bonuses, etc.)
- Use perPlayer: true for values that vary by player
- Use perPlayer: false for shared/global values
- Scoring formulas should be JavaScript expressions (e.g., "(bid === tricks) ? bid * 20 : -10")
- Validation rules should prevent invalid input
- Include helper text to guide users

Rulebook text:
{{PDF_TEXT}}`;
}

/**
 * Stage 3: Generate structured rules documentation
 */
export const RULES_PROMPT = `You are an expert at writing clear, concise game rules. Generate structured rules documentation.

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code blocks, no explanation - just the JSON.

Required JSON structure:
{
  "overview": "string (2-3 sentences)",
  "setup": ["string (step 1)", "string (step 2)", ...],
  "gameplay": ["string (step 1)", "string (step 2)", ...],
  "scoring": ["string (rule 1)", "string (rule 2)", ...],
  "winning": "string (how to win)",
  "fullRules": {
    "sections": [
      {
        "title": "string",
        "content": "string"
      }
    ]
  }
}

GUIDELINES:
- Keep overview concise
- Setup steps should be chronological
- Gameplay steps should explain one round
- Scoring rules should be clear and specific
- Include all special rules and edge cases in fullRules

Rulebook text:
{{PDF_TEXT}}`;

/**
 * Helper to replace placeholders in prompts
 */
export function fillPrompt(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}
