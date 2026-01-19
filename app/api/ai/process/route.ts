import { NextResponse } from 'next/server';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { uploadLogs, aiGeneratedGames } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { downloadPDF, extractTextFromPDF, validatePDFText } from '@/lib/ai/pdf-extractor';
import { generateHTMLScorecardOnly } from '@/lib/ai/game-generator';
import slugify from 'slugify';

export const maxDuration = 300; // 5 minutes for AI processing

/**
 * Background processing endpoint for AI game generation
 * Called by the upload route to process PDFs asynchronously
 */
export async function POST(request: Request) {
  let uploadId: string | undefined;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          'Database not configured. Set POSTGRES_URL / DATABASE_URL to enable AI processing.',
      },
      { status: 503 }
    );
  }

  const db = getDb();

  try {
    const body = await request.json();
    uploadId = body.uploadId;
    const { pdfUrl, rulesText, gameName, existingGameSlug, reviewMode, aiModel } = body;

    // For replace-rules flow, uploadId is optional
    // For review mode, uploadId is required
    if (!uploadId && !existingGameSlug) {
      return NextResponse.json(
        { error: 'Missing uploadId or existingGameSlug' },
        { status: 400 }
      );
    }

    let extractedText: string;

    // Check if this is text-based or PDF-based submission
    if (rulesText && gameName) {
      // Text-based submission - skip PDF parsing
      console.log('Processing text-based submission for:', gameName);
      extractedText = rulesText;

      // Update status: Text received (if this is an upload flow)
      if (uploadId) {
        await db
          .update(uploadLogs)
          .set({ status: 'pdf_parsed' })
          .where(eq(uploadLogs.id, uploadId));
      }
    } else if (pdfUrl) {
      // PDF-based submission
      console.log('Processing PDF-based submission');

      // Update status: PDF parsing (if this is an upload flow)
      if (uploadId) {
        await db
          .update(uploadLogs)
          .set({ status: 'pdf_parsed' })
          .where(eq(uploadLogs.id, uploadId));
      }

      // Download and extract PDF text
      const pdfBuffer = await downloadPDF(pdfUrl);
      const { text: pdfText } = await extractTextFromPDF(pdfBuffer);
      extractedText = pdfText;

      // Validate PDF text
      const textValidation = validatePDFText(pdfText);
      if (!textValidation.isValid) {
        if (uploadId) {
          await db
            .update(uploadLogs)
            .set({
              status: 'failed',
              errorMessage: textValidation.error,
            })
            .where(eq(uploadLogs.id, uploadId));
        }

        return NextResponse.json({ error: textValidation.error }, { status: 400 });
      }
    } else {
      return NextResponse.json(
        { error: 'Missing pdfUrl or rulesText' },
        { status: 400 }
      );
    }

    // Update status: AI processing (if this is an upload flow)
    if (uploadId) {
      await db
        .update(uploadLogs)
        .set({ status: 'ai_processing' })
        .where(eq(uploadLogs.id, uploadId));
    }

    // Run AI generation (fast HTML-only pipeline)
    const selectedModel = aiModel || 'gpt-5.2';
    console.log(`[AI Process] Using AI model: ${selectedModel}`);
    const { summary, htmlScorecard } = await generateHTMLScorecardOnly(
      extractedText,
      gameName,
      selectedModel
    );

    console.log('[AI Process] ✅ Generated HTML scorecard and summary');

    // HTML scorecards are self-contained, so they're always ready
    const gameStatus = 'ready';

    let gameSlug: string;
    let game: any;

    // REVIEW MODE: Store in metadata for user review, don't create database records yet
    if (reviewMode && uploadId) {
      // Generate slug for review
      const baseSlug = slugify(summary.gameName, { lower: true, strict: true });
      gameSlug = baseSlug;
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

      // Store parsed data in upload log metadata for review
      await db
        .update(uploadLogs)
        .set({
          status: 'awaiting_review',
          generationMetadata: {
            parsedSummary: summary,
            parsedHtmlScorecard: htmlScorecard,
            originalRulesText: extractedText,
            gameSlug,
            pdfUrl,
            aiModel: selectedModel,
            generatedAt: new Date().toISOString(),
          },
        })
        .where(eq(uploadLogs.id, uploadId));

      return NextResponse.json({
        success: true,
        gameSlug,
        needsReview: true,
      });
    }

    // Check if we're updating an existing game or creating a new one
    if (existingGameSlug) {
      // Update existing game
      gameSlug = existingGameSlug;

      const existingGames = await db
        .select()
        .from(aiGeneratedGames)
        .where(eq(aiGeneratedGames.gameSlug, gameSlug))
        .limit(1);

      if (existingGames.length === 0) {
        throw new Error(`Game with slug ${gameSlug} not found`);
      }

      game = existingGames[0];

      // Update the game record with new metadata and HTML scorecard
      await db
        .update(aiGeneratedGames)
        .set({
          name: summary.gameName,
          description: summary.overview,
          minPlayers: summary.minPlayers || 2,
          maxPlayers: summary.maxPlayers || 6,
          status: gameStatus,
          htmlScorecard,
          generationMetadata: {
            summary,
            generatedAt: new Date().toISOString(),
            aiModel: selectedModel,
          },
        })
        .where(eq(aiGeneratedGames.id, game.id));
    } else {
      // Create new game
      const baseSlug = slugify(summary.gameName, { lower: true, strict: true });
      gameSlug = baseSlug;
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

      // Create game record with HTML scorecard
      [game] = await db
        .insert(aiGeneratedGames)
        .values({
          gameSlug,
          name: summary.gameName,
          description: summary.overview,
          minPlayers: summary.minPlayers || 2,
          maxPlayers: summary.maxPlayers || 6,
          status: gameStatus,
          pdfUrl,
          htmlScorecard,
          generationMetadata: {
            summary,
            generatedAt: new Date().toISOString(),
            aiModel: selectedModel,
          },
        })
        .returning();
    }

    // Update upload log to completed (if this was an upload flow)
    if (uploadId) {
      await db
        .update(uploadLogs)
        .set({
          status: 'completed',
          gameId: game.id,
        })
        .where(eq(uploadLogs.id, uploadId));
    }

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
