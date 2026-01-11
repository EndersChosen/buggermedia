import { SUMMARY_PROMPT, getDefinitionPrompt, RULES_PROMPT, HTML_SCORECARD_PROMPT, fillPrompt } from './prompts';
import { getReferenceSchemaString } from './reference-schema';
import { AIProvider, getAIProvider, AIModel } from './providers';

/**
 * Sanitize AI-generated JSON response
 * - Removes markdown code blocks if present
 * - Attempts to extract valid JSON
 */
function sanitizeJsonResponse(text: string): string {
  // Remove markdown code blocks if present
  let sanitized = text.trim();

  // Check for markdown code blocks
  const codeBlockMatch = sanitized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    sanitized = codeBlockMatch[1].trim();
  }

  return sanitized;
}

export interface GameSummary {
  gameName: string;
  overview: string;
  minPlayers: number;
  maxPlayers: number;
  rounds: {
    type: 'fixed' | 'variable';
    count: number | null;
  };
  winCondition: string;
  scoringOverview: string;
}

export interface GameDefinition {
  metadata: {
    name: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
  };
  rounds: {
    type: 'fixed' | 'variable';
    maxRounds: number;
    fields: Array<{
      id: string;
      label: string;
      type: 'number' | 'boolean' | 'select' | 'multi-select';
      perPlayer: boolean;
      validation?: {
        min?: number;
        max?: number;
        maxExpression?: string;
        sum?: number;
        required?: boolean;
      };
      options?: string[];
      helperText?: string;
    }>;
  };
  scoring: {
    formulas: Array<{
      name: string;
      expression: string;
      variables: string[];
      scope: 'per-round' | 'cumulative';
    }>;
  };
  winCondition: {
    type: 'highest-score' | 'first-to-target' | 'custom';
    target?: number;
    expression?: string;
    description?: string;
  };
}

export interface GameRules {
  overview: string;
  setup: string[];
  gameplay: string[];
  scoring: string[];
  winning: string;
  fullRules: {
    sections: Array<{
      title: string;
      content: string;
    }>;
  };
}

/**
 * Stage 1: Extract summary from PDF text
 */
export async function generateGameSummary(
  pdfText: string,
  provider: AIProvider
): Promise<GameSummary> {
  const prompt = fillPrompt(SUMMARY_PROMPT, { PDF_TEXT: pdfText });
  const responseText = await provider.generateCompletion(prompt);

  try {
    const sanitized = sanitizeJsonResponse(responseText);
    return JSON.parse(sanitized);
  } catch (error) {
    console.error('[Game Generator] Raw summary response:', responseText);
    throw new Error(
      `Failed to parse summary JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Stage 2: Generate full game definition
 */
export async function generateGameDefinition(
  pdfText: string,
  summary: GameSummary,
  provider: AIProvider
): Promise<GameDefinition> {
  const referenceSchema = getReferenceSchemaString();
  const summaryString = JSON.stringify(summary, null, 2);
  const prompt = fillPrompt(getDefinitionPrompt(summaryString, referenceSchema), {
    PDF_TEXT: pdfText,
  });

  const responseText = await provider.generateCompletion(prompt);

  try {
    const sanitized = sanitizeJsonResponse(responseText);
    return JSON.parse(sanitized);
  } catch (error) {
    console.error('[Game Generator] Raw definition response:', responseText);
    throw new Error(
      `Failed to parse definition JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Stage 3: Generate rules documentation
 */
export async function generateGameRules(
  pdfText: string,
  provider: AIProvider
): Promise<GameRules> {
  const prompt = fillPrompt(RULES_PROMPT, { PDF_TEXT: pdfText });
  const responseText = await provider.generateCompletion(prompt);

  try {
    const sanitized = sanitizeJsonResponse(responseText);
    return JSON.parse(sanitized);
  } catch (error) {
    console.error('[Game Generator] Raw rules response:', responseText);
    throw new Error(
      `Failed to parse rules JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate standalone HTML scorecard from rules text
 */
export async function generateHTMLScorecard(
  rulesText: string,
  provider: AIProvider
): Promise<string> {
  const prompt = fillPrompt(HTML_SCORECARD_PROMPT, { RULES_TEXT: rulesText });
  const responseText = await provider.generateCompletion(prompt);

  try {
    // Remove markdown code blocks if AI wrapped the HTML
    const sanitized = sanitizeJsonResponse(responseText);

    // Validate it's HTML
    if (!sanitized.trim().toLowerCase().startsWith('<!doctype html')) {
      console.error('[Game Generator] Response does not start with <!DOCTYPE html>');
      console.error('[Game Generator] First 200 chars:', sanitized.substring(0, 200));
      throw new Error('AI did not return valid HTML');
    }

    return sanitized;
  } catch (error) {
    console.error('[Game Generator] Raw HTML response:', responseText);
    throw new Error(
      `Failed to generate HTML scorecard: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Full 3-stage pipeline: PDF text → Summary → Definition → Rules
 */
export async function generateCompleteGame(
  pdfText: string,
  providedGameName?: string,
  aiModel: AIModel = 'claude-sonnet-4'
): Promise<{
  summary: GameSummary;
  definition: GameDefinition;
  rules: GameRules;
}> {
  const provider = getAIProvider(aiModel);

  // Stage 1: Extract summary
  const summary = await generateGameSummary(pdfText, provider);

  // Override game name if provided
  if (providedGameName) {
    summary.gameName = providedGameName;
  }

  // Stage 2: Generate definition
  const definition = await generateGameDefinition(pdfText, summary, provider);

  // Override definition metadata name if provided
  if (providedGameName) {
    definition.metadata.name = providedGameName;
  }

  // Stage 3: Generate rules
  const rules = await generateGameRules(pdfText, provider);

  return { summary, definition, rules };
}

/**
 * New HTML-based pipeline: Rules text → HTML Scorecard + JSON metadata
 */
export async function generateGameWithHTML(
  rulesText: string,
  providedGameName?: string,
  aiModel: AIModel = 'gpt-5.2'
): Promise<{
  summary: GameSummary;
  definition: GameDefinition;
  rules: GameRules;
  htmlScorecard: string;
}> {
  const provider = getAIProvider(aiModel);

  // Generate HTML scorecard
  const htmlScorecard = await generateHTMLScorecard(rulesText, provider);

  // Also generate the JSON data (for metadata and rules display)
  const summary = await generateGameSummary(rulesText, provider);
  if (providedGameName) {
    summary.gameName = providedGameName;
  }

  const definition = await generateGameDefinition(rulesText, summary, provider);
  if (providedGameName) {
    definition.metadata.name = providedGameName;
  }

  const rules = await generateGameRules(rulesText, provider);

  return { summary, definition, rules, htmlScorecard };
}

/**
 * Fast HTML-only generation: Rules text → HTML Scorecard + minimal summary
 * Skips definition/rules generation to avoid timeouts
 */
export async function generateHTMLScorecardOnly(
  rulesText: string,
  providedGameName?: string,
  aiModel: AIModel = 'gpt-5.2'
): Promise<{
  summary: GameSummary;
  htmlScorecard: string;
}> {
  const provider = getAIProvider(aiModel);

  console.log('[Game Generator] 🚀 Starting fast HTML-only generation');

  // Generate HTML scorecard and summary in parallel for speed
  const [htmlScorecard, summary] = await Promise.all([
    generateHTMLScorecard(rulesText, provider),
    generateGameSummary(rulesText, provider),
  ]);

  if (providedGameName) {
    summary.gameName = providedGameName;
  }

  console.log('[Game Generator] ✅ Fast HTML generation complete');

  return { summary, htmlScorecard };
}
