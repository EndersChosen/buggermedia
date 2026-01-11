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
  "teams": {
    "enabled": boolean (true if players form teams/partnerships),
    "size": number (players per team, e.g., 2 for partnerships),
    "count": number (number of teams, e.g., 2)
  },
  "rounds": {
    "type": "fixed" | "variable",
    "count": number (or null if variable)
  },
  "winCondition": "string (how to win)",
  "scoringOverview": "string (brief description of scoring)",
  "scoringUnit": "individual" | "team" (whether scores are tracked per player or per team)
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
    "maxPlayers": number,
    "teams": {
      "enabled": boolean (true if players form teams/partnerships),
      "size": number (players per team),
      "count": number (number of teams),
      "scoringUnit": "individual" | "team" (whether to track scores per player or per team)
    }
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
        "perTeam": boolean (use this for team-based games where values are per team, not per player),
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
        "scope": "per-round" | "cumulative",
        "aggregateTeam": boolean (optional, true if team members' scores should be combined)
      }
    ]
  },
  "winCondition": {
    "type": "highest-score" | "first-to-target" | "custom",
    "target": number (optional),
    "expression": "string (optional, for custom)",
    "unit": "individual" | "team" (whether win is determined by individual or team score)
  }
}

GUIDELINES:
- Create fields for ALL tracked values (bids, tricks, bonuses, etc.)
- CRITICAL: Every field MUST have BOTH perPlayer and perTeam set as boolean values (true or false)
- For TEAM GAMES (like Spades, Bridge):
  * Set metadata.teams.enabled to true
  * Set metadata.teams.size (e.g., 2 for partnerships)
  * Set metadata.teams.scoringUnit to "team" if scores combine across partners
  * For fields tracked per team: perTeam: true, perPlayer: false
  * For fields tracked per player: perPlayer: true, perTeam: false
  * In scoring formulas, use aggregateTeam: true to sum partner scores
- For INDIVIDUAL GAMES:
  * Set metadata.teams.enabled to false
  * For player-specific values: perPlayer: true, perTeam: false
  * For shared/global values: perPlayer: false, perTeam: false
- Scoring formulas should be JavaScript expressions (e.g., "(bid === tricks) ? bid * 20 : -10")
- Validation rules should prevent invalid input
- Include helper text to guide users

CRITICAL FOR TEAM GAMES:
If the game has partnerships/teams, you MUST include team information in metadata.teams and use perTeam fields where appropriate. For example, in Spades:
- Individual bids: perPlayer: true, perTeam: false (each player bids separately)
- Team contract: perTeam: true, perPlayer: false (partners' bids are combined)
- Scoring is by team (scoringUnit: "team")

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
 * Stage 4: Refine game definition based on user feedback
 */
export function getRefinementPrompt(
  rulesText: string,
  currentDefinition: any,
  summary: any,
  userFeedback: string
): string {
  return `You are an expert at designing score tracking systems for card games. A user has reviewed your initial game definition and provided feedback. Your task is to regenerate the definition incorporating their corrections.

ORIGINAL RULEBOOK TEXT:
${rulesText}

GAME SUMMARY:
${JSON.stringify(summary, null, 2)}

CURRENT GAME DEFINITION:
${JSON.stringify(currentDefinition, null, 2)}

USER FEEDBACK:
"${userFeedback}"

TASK:
Carefully read the user's feedback and regenerate the complete game definition to address their concerns. Common feedback includes:
- Team/partnership configurations that were missed
- Fields that should be per-team vs per-player
- Scoring formulas that need to aggregate team members
- Missing game mechanics or fields
- Incorrect validation rules

IMPORTANT: Respond ONLY with valid JSON. No markdown formatting, no code blocks, no explanation text - just the JSON object. The structure must match this format:

{
  "metadata": {
    "name": "string",
    "description": "string",
    "minPlayers": number,
    "maxPlayers": number,
    "teams": {
      "enabled": boolean,
      "size": number,
      "count": number,
      "scoringUnit": "individual" | "team"
    }
  },
  "rounds": {
    "type": "fixed" | "variable",
    "maxRounds": number,
    "fields": [
      {
        "id": "string",
        "label": "string",
        "type": "number" | "boolean" | "select" | "multi-select",
        "perPlayer": boolean,
        "perTeam": boolean,
        "validation": { ... },
        "options": [...] (optional),
        "helperText": "string" (optional)
      }
    ]
  },
  "scoring": {
    "formulas": [
      {
        "name": "string",
        "expression": "string (JavaScript)",
        "variables": ["string"],
        "scope": "per-round" | "cumulative",
        "aggregateTeam": boolean (optional)
      }
    ]
  },
  "winCondition": {
    "type": "highest-score" | "first-to-target" | "custom",
    "target": number (optional),
    "expression": "string" (optional),
    "unit": "individual" | "team"
  }
}

CRITICAL REMINDERS:
- EVERY field MUST have BOTH perPlayer and perTeam set as boolean values (true or false) - this is required!
- If user mentions "teams" or "partnerships", ensure metadata.teams.enabled is true
- If scores should combine across partners, use aggregateTeam: true in scoring formulas
- For team-tracked fields: perTeam: true, perPlayer: false
- For player-tracked fields: perPlayer: true, perTeam: false
- For shared/global fields: perPlayer: false, perTeam: false
- Ensure winCondition.unit matches how the game determines winners

Generate the complete, corrected game definition now.`;
}

/**
 * Generate standalone HTML scorecard from game rules
 */
export const HTML_SCORECARD_PROMPT = `You are an expert at creating interactive score tracking web applications for card games. Generate a complete, standalone HTML scorecard based on the game rules provided.

IMPORTANT: Respond ONLY with valid HTML. No markdown code blocks, no explanation text - just the complete HTML document.

REQUIREMENTS:

1. **Complete HTML Document**
   - Include <!DOCTYPE html>, <html>, <head>, and <body> tags
   - Embed all CSS in <style> tags
   - Embed all JavaScript in <script> tags
   - Must be completely self-contained (no external dependencies)

2. **Detect Game Type**
   - Analyze the rules to determine if this is:
     * Individual scoring (each player tracks their own score)
     * Team/Partnership scoring (players form teams, scores combine)
   - Design the UI accordingly

3. **Score Tracking Interface**
   - Create input fields for all relevant game data (bids, tricks, cards played, etc.)
   - Display running totals for each player/team
   - Show current round/hand number
   - Track any special mechanics (bags, penalties, bonuses, nil bids, etc.)

4. **Auto-Calculation**
   - Implement scoring logic in JavaScript
   - Automatically calculate scores when inputs change
   - Update totals in real-time
   - Handle all special rules and edge cases

5. **Professional Design**
   - Clean, modern styling
   - Responsive table layout
   - Clear labels and helper text
   - Easy-to-use inputs (number, checkbox, select as appropriate)
   - Highlight totals and important information

6. **Game State Management**
   - "Add Hand/Round" button to add new rows
   - Preserve all entered data
   - Track cumulative totals across all rounds

7. **Example Structure** (adapt as needed for the specific game):
   \`\`\`html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <meta charset="UTF-8">
     <title>[Game Name] Score Card</title>
     <style>
       /* Clean, professional CSS */
     </style>
   </head>
   <body>
     <h1>[Game Name] Score Card</h1>
     <p>Brief instructions...</p>

     <table id="scoreTable">
       <thead>
         <tr>
           <th>Round</th>
           <!-- Dynamic headers based on game -->
         </tr>
       </thead>
       <tbody></tbody>
       <tfoot>
         <tr>
           <td>Total</td>
           <!-- Totals -->
         </tr>
       </tfoot>
     </table>

     <button onclick="addRound()">Add Round</button>

     <script>
       // Game state
       // Scoring logic
       // Auto-calculation
       // Add round functionality
     </script>
   </body>
   </html>
   \`\`\`

CRITICAL GUIDELINES:

- **Teams/Partnerships**: If the rules mention "teams", "partnerships", "pairs", or describe players working together, create a team-based scorecard with combined scoring
- **Scoring Logic**: Implement ALL scoring rules exactly as described, including bonuses, penalties, and special conditions
- **Special Mechanics**: Track things like bags (Spades), nil bids, penalties for accumulating overtricks, etc.
- **Input Validation**: Use appropriate input types (number with min/max where applicable)
- **Calculation Triggers**: Recalculate all scores whenever any input changes
- **State Preservation**: Use variables to track cumulative state (total scores, bags, penalties applied, etc.)

GAME RULES:
{{RULES_TEXT}}

Generate the complete HTML scorecard now. Remember: ONLY HTML, no markdown blocks, no explanations.`;

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
