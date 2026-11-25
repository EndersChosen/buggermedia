/**
 * Score card generation with structured output, validation and repair.
 *
 * Flow: build the request (rules text and/or an attached rule book) -> ask the
 * model for JSON constrained to the score card schema -> validate it
 * (schema + semantic checks + dry run) -> if invalid, send the errors back in
 * the same conversation and ask for a corrected card (up to MAX_ATTEMPTS).
 *
 * Server-only: reads API keys from the environment.
 */

import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import OpenAI from 'openai';
import { z } from 'zod';
import { ScoreCardSchema, type ScoreCard } from '@/lib/scorecard/schema';
import { validateScoreCard } from '@/lib/scorecard/validate';
import { SYSTEM_PROMPT, createUserPrompt, refineUserPrompt, repairPrompt } from './prompts';
import { getModelOption, type ModelId } from './models';

export const MAX_ATTEMPTS = 3;

export type GenerationSource =
  | { kind: 'text'; rulesText: string }
  | { kind: 'pdf'; base64: string; filename: string; rulesText?: string }
  | { kind: 'image'; base64: string; mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'; rulesText?: string };

export interface GenerateRequest {
  model: ModelId;
  gameName?: string;
  notes?: string;
  source: GenerationSource;
}

export interface RefineRequest {
  model: ModelId;
  card: ScoreCard;
  instruction: string;
  rulesText?: string;
}

export interface GenerationResult {
  card: ScoreCard;
  warnings: string[];
  attempts: number;
  model: string;
  /** The model that actually answered, if a server-side fallback ran. */
  servedBy?: string;
}

export class GenerationError extends Error {
  constructor(
    message: string,
    readonly status: number = 502,
    readonly details: string[] = []
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}

// ---------------------------------------------------------------------------
// Provider-neutral conversation
// ---------------------------------------------------------------------------

type Turn =
  | { role: 'user'; text: string; attachment?: Exclude<GenerationSource, { kind: 'text' }> }
  | { role: 'assistant'; text: string; raw?: unknown };

interface ModelReply {
  text: string;
  /** Provider-specific assistant content to replay on the next turn. */
  raw?: unknown;
  servedBy?: string;
}

interface Provider {
  complete(turns: Turn[]): Promise<ModelReply>;
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

let anthropicFormat: ReturnType<typeof zodOutputFormat> | undefined;
function scoreCardOutputFormat() {
  anthropicFormat ??= zodOutputFormat(ScoreCardSchema);
  return anthropicFormat;
}

class AnthropicProvider implements Provider {
  private client = new Anthropic({ maxRetries: 2 });

  constructor(private model: string) {}

  async complete(turns: Turn[]): Promise<ModelReply> {
    const messages: Anthropic.Beta.BetaMessageParam[] = turns.map((t) => {
      if (t.role === 'assistant') {
        return {
          role: 'assistant',
          content: (t.raw as Anthropic.Beta.BetaContentBlockParam[] | undefined) ?? t.text,
        };
      }
      const content: Anthropic.Beta.BetaContentBlockParam[] = [];
      if (t.attachment?.kind === 'pdf') {
        content.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: t.attachment.base64 },
          title: t.attachment.filename,
        });
      } else if (t.attachment?.kind === 'image') {
        content.push({
          type: 'image',
          source: { type: 'base64', media_type: t.attachment.mediaType, data: t.attachment.base64 },
        });
      }
      content.push({ type: 'text', text: t.text });
      return { role: 'user', content };
    });

    const format = scoreCardOutputFormat();

    try {
      const stream = this.client.beta.messages.stream({
        model: this.model,
        max_tokens: 32000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: format.schema },
        },
        messages,
      });
      const message = await stream.finalMessage();

      if (message.stop_reason === 'refusal') {
        throw new GenerationError(
          'The AI declined to create this score card. Try rephrasing the rules or removing unrelated content.',
          422
        );
      }
      if (message.stop_reason === 'max_tokens') {
        throw new GenerationError('The AI response was cut off before the score card was complete.', 502);
      }

      const text = message.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');

      return {
        text,
        raw: message.content as unknown as Anthropic.Beta.BetaContentBlockParam[],
        servedBy: message.model !== this.model ? message.model : undefined,
      };
    } catch (error) {
      throw mapAnthropicError(error);
    }
  }
}

function mapAnthropicError(error: unknown): Error {
  if (error instanceof GenerationError) return error;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new GenerationError('The AI service rejected the server\'s API key. Check ANTHROPIC_API_KEY.', 503);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new GenerationError('The AI service is busy (rate limited). Please try again in a minute.', 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new GenerationError(`The AI service rejected the request: ${error.message}`, 400);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new GenerationError('Could not reach the AI service. Please try again.', 503);
  }
  if (error instanceof Anthropic.APIError) {
    return new GenerationError(`The AI service returned an error (${error.status ?? 'unknown'}). Please try again.`, 502);
  }
  return error instanceof Error ? error : new Error(String(error));
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

let openAiSchema: Record<string, unknown> | undefined;
function openAiJsonSchema() {
  if (!openAiSchema) {
    const schema = z.toJSONSchema(ScoreCardSchema, { target: 'draft-7' }) as Record<string, unknown>;
    delete schema.$schema;
    openAiSchema = schema;
  }
  return openAiSchema;
}

class OpenAIProvider implements Provider {
  private client = new OpenAI({ maxRetries: 2 });

  constructor(private model: string) {}

  async complete(turns: Turn[]): Promise<ModelReply> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [{ role: 'system', content: SYSTEM_PROMPT }];
    for (const t of turns) {
      if (t.role === 'assistant') {
        messages.push({ role: 'assistant', content: t.text });
        continue;
      }
      const parts: OpenAI.Chat.ChatCompletionContentPart[] = [];
      if (t.attachment?.kind === 'pdf') {
        parts.push({
          type: 'file',
          file: { filename: t.attachment.filename, file_data: `data:application/pdf;base64,${t.attachment.base64}` },
        });
      } else if (t.attachment?.kind === 'image') {
        parts.push({
          type: 'image_url',
          image_url: { url: `data:${t.attachment.mediaType};base64,${t.attachment.base64}` },
        });
      }
      parts.push({ type: 'text', text: t.text });
      messages.push({ role: 'user', content: parts });
    }

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_completion_tokens: 32000,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'score_card', schema: openAiJsonSchema(), strict: true },
        },
      });
      const choice = response.choices[0];
      if (choice?.message?.refusal) {
        throw new GenerationError(`The AI declined to create this score card: ${choice.message.refusal}`, 422);
      }
      if (choice?.finish_reason === 'length') {
        throw new GenerationError('The AI response was cut off before the score card was complete.', 502);
      }
      return { text: choice?.message?.content ?? '' };
    } catch (error) {
      if (error instanceof GenerationError) throw error;
      if (error instanceof OpenAI.AuthenticationError) {
        throw new GenerationError('The AI service rejected the server\'s API key. Check OPENAI_API_KEY.', 503);
      }
      if (error instanceof OpenAI.RateLimitError) {
        throw new GenerationError('The AI service is busy (rate limited). Please try again in a minute.', 429);
      }
      if (error instanceof OpenAI.APIError) {
        throw new GenerationError(`The AI service returned an error (${error.status ?? 'unknown'}): ${error.message}`, 502);
      }
      throw error;
    }
  }
}

function getProvider(modelId: ModelId): Provider {
  const option = getModelOption(modelId);
  if (!option || !option.available) {
    throw new GenerationError(`The AI model "${modelId}" isn't configured on this server.`, 400);
  }
  return option.provider === 'anthropic' ? new AnthropicProvider(option.apiModel) : new OpenAIProvider(option.apiModel);
}

// ---------------------------------------------------------------------------
// Generate / refine with repair loop
// ---------------------------------------------------------------------------

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Tolerate a stray code fence or prose around the object.
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error('Response was not valid JSON');
  }
}

async function runWithRepair(
  provider: Provider,
  firstTurn: Turn,
  modelId: ModelId,
  overrides: { gameName?: string } = {}
): Promise<GenerationResult> {
  const turns: Turn[] = [firstTurn];
  let lastErrors: string[] = [];
  let servedBy: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const reply = await provider.complete(turns);
    servedBy = reply.servedBy ?? servedBy;
    turns.push({ role: 'assistant', text: reply.text, raw: reply.raw });

    let candidate: unknown;
    try {
      candidate = parseJson(reply.text);
    } catch (e) {
      lastErrors = [e instanceof Error ? e.message : 'Response was not valid JSON'];
      turns.push({ role: 'user', text: repairPrompt(lastErrors) });
      continue;
    }

    if (overrides.gameName && candidate && typeof candidate === 'object') {
      (candidate as Record<string, unknown>).name = overrides.gameName;
    }

    const result = validateScoreCard(candidate);
    if (result.ok && result.card) {
      return { card: result.card, warnings: result.warnings, attempts: attempt, model: modelId, servedBy };
    }

    lastErrors = result.errors;
    console.warn(`[scorecard] attempt ${attempt} failed validation:`, lastErrors);
    turns.push({ role: 'user', text: repairPrompt(lastErrors) });
  }

  throw new GenerationError(
    `The AI couldn't produce a valid score card after ${MAX_ATTEMPTS} attempts.`,
    502,
    lastErrors
  );
}

export async function generateScoreCard(request: GenerateRequest): Promise<GenerationResult> {
  const provider = getProvider(request.model);
  const { source } = request;
  const attachment = source.kind === 'text' ? undefined : source;
  const text = createUserPrompt({
    gameName: request.gameName,
    rulesText: source.rulesText,
    hasAttachment: Boolean(attachment),
    notes: request.notes,
  });
  return runWithRepair(provider, { role: 'user', text, attachment }, request.model, {
    gameName: request.gameName,
  });
}

export async function refineScoreCard(request: RefineRequest): Promise<GenerationResult> {
  const provider = getProvider(request.model);
  const text = refineUserPrompt(JSON.stringify(request.card, null, 2), request.instruction, request.rulesText);
  return runWithRepair(provider, { role: 'user', text }, request.model);
}
