import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadLogs, aiGeneratedGames, gameDefinitions, gameRules } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { downloadPDF, extractTextFromPDF, validatePDFText } from '@/lib/ai/pdf-extractor';
import { generateCompleteGame } from '@/lib/ai/game-generator';
import { validateCompleteGame } from '@/lib/ai/validator';
import { validateGameDefinition } from '@/lib/ai/game-validator';
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
    const { pdfUrl, rulesText, gameName, existingGameSlug } = body;

    // For replace-rules flow, uploadId is optional
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

    // Run AI generation (3-stage pipeline)
    const { summary, definition, rules } = await generateCompleteGame(extractedText, gameName);

    // Validate AI outputs
    const validation = validateCompleteGame({ summary, definition, rules });
    if (!validation.isValid) {
      if (uploadId) {
        await db
          .update(uploadLogs)
          .set({
            status: 'failed',
            errorMessage: `AI generation validation failed: ${validation.errors.join(', ')}`,
          })
          .where(eq(uploadLogs.id, uploadId));
      }

      return NextResponse.json(
        { error: 'AI generation validation failed', details: validation.errors },
        { status: 500 }
      );
    }

    // Validate the generated definition for completeness
    const definitionValidation = validateGameDefinition(definition);
    const gameStatus = definitionValidation.isComplete ? 'ready' : 'processing';

    let gameSlug: string;
    let game: any;

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

      // Update the game record with new metadata
      await db
        .update(aiGeneratedGames)
        .set({
          name: definition.metadata.name || summary.gameName,
          description: definition.metadata.description || summary.overview,
          minPlayers: definition.metadata.minPlayers || 2,
          maxPlayers: definition.metadata.maxPlayers || 6,
          status: gameStatus,
          generationMetadata: {
            summary,
            generatedAt: new Date().toISOString(),
            needsCompletion: !definitionValidation.isComplete,
            validationIssues: definitionValidation.issues,
          },
        })
        .where(eq(aiGeneratedGames.id, game.id));

      // Get the current max version
      const existingDefinitions = await db
        .select()
        .from(gameDefinitions)
        .where(eq(gameDefinitions.gameId, game.id))
        .orderBy(desc(gameDefinitions.version))
        .limit(1);

      const nextVersion = existingDefinitions.length > 0 ? existingDefinitions[0].version + 1 : 1;

      // Store new version of game definition
      await db.insert(gameDefinitions).values({
        gameId: game.id,
        definition,
        version: nextVersion,
      });

      // Update game rules (replace existing)
      await db.delete(gameRules).where(eq(gameRules.gameId, game.id));
      await db.insert(gameRules).values({
        gameId: game.id,
        rules,
      });
    } else {
      // Create new game
      const baseSlug = slugify(definition.metadata.name, { lower: true, strict: true });
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

      // Create game record
      [game] = await db
        .insert(aiGeneratedGames)
        .values({
          gameSlug,
          name: definition.metadata.name || summary.gameName,
          description: definition.metadata.description || summary.overview,
          minPlayers: definition.metadata.minPlayers || 2,
          maxPlayers: definition.metadata.maxPlayers || 6,
          status: gameStatus,
          pdfUrl,
          generationMetadata: {
            summary,
            generatedAt: new Date().toISOString(),
            needsCompletion: !definitionValidation.isComplete,
            validationIssues: definitionValidation.issues,
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
      needsCompletion: !definitionValidation.isComplete,
      validationIssues: definitionValidation.issues,
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
