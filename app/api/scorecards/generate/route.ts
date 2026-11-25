import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateScoreCard,
  GenerationError,
  refineScoreCard,
  type GenerationSource,
} from '@/lib/ai/generate';
import { DEFAULT_MODEL, isModelId, type ModelId } from '@/lib/ai/models';
import { validateScoreCard } from '@/lib/scorecard/validate';
import { checkRateLimit, clientKey } from '@/lib/server/rate-limit';
import { MAX_RULES_CHARS, MAX_UPLOAD_BYTES } from '@/lib/scorecard/limits';

// Generation can take a minute or two with a long rule book (model call plus up to two repairs).
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

const CreateBody = z.object({
  mode: z.literal('create'),
  gameName: z.string().max(200).optional(),
  rulesText: z.string().max(MAX_RULES_CHARS),
  notes: z.string().max(4000).optional(),
  model: z.string().optional(),
});

const RefineBody = z.object({
  mode: z.literal('refine'),
  card: z.unknown(),
  instruction: z.string().min(3).max(4000),
  rulesText: z.string().max(MAX_RULES_CHARS).optional(),
  model: z.string().optional(),
});

function error(message: string, status: number, details: string[] = []) {
  return NextResponse.json({ error: message, details }, { status });
}

function pickModel(value: unknown): ModelId {
  return isModelId(value) ? value : DEFAULT_MODEL;
}

/** Per-connection AI call budget; only requests that reach the model count. */
function overLimit(request: Request) {
  const wait = checkRateLimit(clientKey(request), 20, 60 * 60 * 1000);
  return wait > 0
    ? error(`Too many score cards generated from this connection. Try again in ${Math.ceil(wait / 60)} minutes.`, 429)
    : null;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      const gameName = (form.get('gameName') as string | null)?.trim() || undefined;
      const notes = (form.get('notes') as string | null)?.trim() || undefined;
      const rulesText = (form.get('rulesText') as string | null)?.trim() || undefined;
      const model = pickModel(form.get('model'));

      if (rulesText && rulesText.length > MAX_RULES_CHARS) {
        return error('That rule book is too long. Paste just the scoring and end-of-game sections.', 413);
      }

      let source: GenerationSource;
      if (file instanceof File && file.size > 0) {
        if (file.size > MAX_UPLOAD_BYTES) {
          return error('That file is too large to upload. Files over 4 MB are read in your browser instead; reload and try again.', 413);
        }
        const bytes = Buffer.from(await file.arrayBuffer());
        const isPdf = file.type === 'application/pdf' || bytes.subarray(0, 5).toString('latin1') === '%PDF-';
        if (isPdf) {
          if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
            return error("That file doesn't look like a valid PDF.", 400);
          }
          source = { kind: 'pdf', base64: bytes.toString('base64'), filename: file.name || 'rules.pdf', rulesText };
        } else if ((IMAGE_TYPES as readonly string[]).includes(file.type)) {
          source = {
            kind: 'image',
            base64: bytes.toString('base64'),
            mediaType: file.type as (typeof IMAGE_TYPES)[number],
            rulesText,
          };
        } else {
          return error('Unsupported file type. Upload a PDF, an image of the rules, or a text file.', 415);
        }
      } else if (rulesText) {
        source = { kind: 'text', rulesText };
      } else {
        return error('Add a rule book file or some rules text.', 400);
      }

      const limited = overLimit(request);
      if (limited) return limited;
      const result = await generateScoreCard({ model, gameName, notes, source });
      return NextResponse.json(result);
    }

    const json = await request.json().catch(() => null);
    if (!json || typeof json !== 'object') return error('Invalid request body.', 400);

    if ((json as { mode?: string }).mode === 'refine') {
      const body = RefineBody.safeParse(json);
      if (!body.success) return error('Invalid refine request.', 400, body.error.issues.map((i) => i.message));
      const current = validateScoreCard(body.data.card);
      if (!current.card) return error('The current score card is invalid.', 400, current.errors);
      const limited = overLimit(request);
      if (limited) return limited;
      const result = await refineScoreCard({
        model: pickModel(body.data.model),
        card: current.card,
        instruction: body.data.instruction,
        rulesText: body.data.rulesText,
      });
      return NextResponse.json(result);
    }

    const body = CreateBody.safeParse(json);
    if (!body.success) {
      const tooLong = body.error.issues.some((i) => i.code === 'too_big');
      return error(
        tooLong ? 'That text is too long. Paste just the scoring and end-of-game sections.' : 'Invalid request.',
        tooLong ? 413 : 400
      );
    }
    const { gameName, rulesText, notes, model } = body.data;
    if (rulesText.trim().length < 20 && !gameName) {
      return error('Describe how the game is scored (a few sentences is enough), or give the game name.', 400);
    }
    const limited = overLimit(request);
    if (limited) return limited;
    const result = await generateScoreCard({
      model: pickModel(model),
      gameName: gameName?.trim() || undefined,
      notes: notes?.trim() || undefined,
      source: { kind: 'text', rulesText: rulesText.trim() },
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GenerationError) return error(e.message, e.status, e.details);
    console.error('[scorecards/generate] unexpected error', e);
    return error('Something went wrong while generating the score card. Please try again.', 500);
  }
}
