import Anthropic from '@anthropic-ai/sdk';
import { SUMMARY_PROMPT, getDefinitionPrompt, RULES_PROMPT, fillPrompt } from './prompts';
import { getReferenceSchemaString } from './reference-schema';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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
export async function generateGameSummary(pdfText: string): Promise<GameSummary> {
  const prompt = fillPrompt(SUMMARY_PROMPT, { PDF_TEXT: pdfText });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new Error(`Failed to parse summary JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stage 2: Generate full game definition
 */
export async function generateGameDefinition(
  pdfText: string,
  summary: GameSummary
): Promise<GameDefinition> {
  const referenceSchema = getReferenceSchemaString();
  const summaryString = JSON.stringify(summary, null, 2);
  const prompt = fillPrompt(
    getDefinitionPrompt(summaryString, referenceSchema),
    { PDF_TEXT: pdfText }
  );

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new Error(`Failed to parse definition JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Stage 3: Generate rules documentation
 */
export async function generateGameRules(pdfText: string): Promise<GameRules> {
  const prompt = fillPrompt(RULES_PROMPT, { PDF_TEXT: pdfText });

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new Error(`Failed to parse rules JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Full 3-stage pipeline: PDF text → Summary → Definition → Rules
 */
export async function generateCompleteGame(
  pdfText: string,
  providedGameName?: string
): Promise<{
  summary: GameSummary;
  definition: GameDefinition;
  rules: GameRules;
}> {
  // Stage 1: Extract summary
  const summary = await generateGameSummary(pdfText);

  // Override game name if provided
  if (providedGameName) {
    summary.gameName = providedGameName;
  }

  // Stage 2: Generate definition
  const definition = await generateGameDefinition(pdfText, summary);

  // Override definition metadata name if provided
  if (providedGameName) {
    definition.metadata.name = providedGameName;
  }

  // Stage 3: Generate rules
  const rules = await generateGameRules(pdfText);

  return { summary, definition, rules };
}
