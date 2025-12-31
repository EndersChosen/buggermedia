import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadLogs, aiGeneratedGames, gameDefinitions, gameRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { downloadPDF, extractTextFromPDF, validatePDFText } from '@/lib/ai/pdf-extractor';
import { generateCompleteGame } from '@/lib/ai/game-generator';
import { validateCompleteGame } from '@/lib/ai/validator';
import slugify from 'slugify';

export const maxDuration = 300; // 5 minutes for AI processing

/**
 * Background processing endpoint for AI game generation
 * Called by the upload route to process PDFs asynchronously
 */
export async function POST(request: Request) {
  let uploadId: string | undefined;

  try {
    const body = await request.json();
    uploadId = body.uploadId;
    const { pdfUrl, rulesText, gameName } = body;

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Missing uploadId' },
        { status: 400 }
      );
    }

    let extractedText: string;

    // Check if this is text-based or PDF-based submission
    if (rulesText && gameName) {
      // Text-based submission - skip PDF parsing
      console.log('Processing text-based submission for:', gameName);
      extractedText = rulesText;

      // Update status: Text received
      await db
        .update(uploadLogs)
        .set({ status: 'pdf_parsed' })
        .where(eq(uploadLogs.id, uploadId));
    } else if (pdfUrl) {
      // PDF-based submission
      console.log('Processing PDF-based submission');

      // Update status: PDF parsing
      await db
        .update(uploadLogs)
        .set({ status: 'pdf_parsed' })
        .where(eq(uploadLogs.id, uploadId));

      // Download and extract PDF text
      const pdfBuffer = await downloadPDF(pdfUrl);
      const { text: pdfText } = await extractTextFromPDF(pdfBuffer);
      extractedText = pdfText;

      // Validate PDF text
      const textValidation = validatePDFText(pdfText);
      if (!textValidation.isValid) {
        await db
          .update(uploadLogs)
          .set({
            status: 'failed',
            errorMessage: textValidation.error,
          })
          .where(eq(uploadLogs.id, uploadId));

        return NextResponse.json({ error: textValidation.error }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: 'Missing pdfUrl or rulesText' },
        { status: 400 }
      );
    }

    // Update status: AI processing
    await db
      .update(uploadLogs)
      .set({ status: 'ai_processing' })
      .where(eq(uploadLogs.id, uploadId));

    // Run AI generation (3-stage pipeline)
    const { summary, definition, rules } = await generateCompleteGame(extractedText, gameName);

    // Validate AI outputs
    const validation = validateCompleteGame({ summary, definition, rules });
    if (!validation.isValid) {
      await db
        .update(uploadLogs)
        .set({
          status: 'failed',
          errorMessage: `AI generation validation failed: ${validation.errors.join(', ')}`,
        })
        .where(eq(uploadLogs.id, uploadId));

      return NextResponse.json(
        { error: 'AI generation validation failed', details: validation.errors },
        { status: 500 }
      );
    }

    // Generate unique slug
    const baseSlug = slugify(definition.metadata.name, { lower: true, strict: true });
    let gameSlug = baseSlug;
    let counter = 1;

    // Check for slug conflicts
    while (true) {
      const existing = await db
        .select()
        .from(aiGeneratedGames)
        .where(eq(aiGeneratedGames.gameSlug, gameSlug))
        .limit(1);

      if (existing.length === 0) break;

      gameSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create game record
    const [game] = await db
      .insert(aiGeneratedGames)
      .values({
        gameSlug,
        name: definition.metadata.name,
        description: definition.metadata.description,
        minPlayers: definition.metadata.minPlayers,
        maxPlayers: definition.metadata.maxPlayers,
        status: 'ready',
        pdfUrl,
        generationMetadata: {
          summary,
          generatedAt: new Date().toISOString(),
        },
      })
      .returning();

    // Store game definition
    await db.insert(gameDefinitions).values({
      gameId: game.id,
      definition,
      version: 1,
    });

    // Store game rules
    await db.insert(gameRules).values({
      gameId: game.id,
      rules,
    });

    // Update upload log to completed
    await db
      .update(uploadLogs)
      .set({
        status: 'completed',
        gameId: game.id,
      })
      .where(eq(uploadLogs.id, uploadId));

    return NextResponse.json({
      success: true,
      gameSlug,
      gameId: game.id,
    });
  } catch (error) {
    console.error('AI processing error:', error);

    // Try to update upload log to failed
    if (uploadId) {
      try {
        await db
          .update(uploadLogs)
          .set({
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          })
          .where(eq(uploadLogs.id, uploadId));
      } catch (updateError) {
        console.error('Failed to update upload log:', updateError);
      }
    }

    return NextResponse.json(
      {
        error: 'AI processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
