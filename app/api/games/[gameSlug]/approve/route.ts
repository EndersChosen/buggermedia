import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadLogs, aiGeneratedGames, gameDefinitions, gameRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    const { uploadId } = await request.json();

    if (!uploadId) {
      return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 });
    }

    // Get the upload log with the parsed definition
    const logs = await db
      .select()
      .from(uploadLogs)
      .where(eq(uploadLogs.id, uploadId))
      .limit(1);

    if (logs.length === 0) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const log = logs[0];
    const metadata = log.generationMetadata as any;

    if (!metadata?.parsedDefinition || !metadata?.parsedRules || !metadata?.parsedSummary) {
      return NextResponse.json(
        { error: 'No parsed data found for this upload' },
        { status: 404 }
      );
    }

    const definition = metadata.parsedDefinition;
    const rules = metadata.parsedRules;
    const summary = metadata.parsedSummary;

    // Check if game already exists (in case of refresh/retry)
    if (log.gameId) {
      // Game already created, just mark as completed
      await db
        .update(uploadLogs)
        .set({ status: 'completed' })
        .where(eq(uploadLogs.id, uploadId));

      return NextResponse.json({ success: true, gameSlug });
    }

    // Create the game record
    const [game] = await db
      .insert(aiGeneratedGames)
      .values({
        gameSlug,
        name: definition.metadata.name || summary.gameName,
        description: definition.metadata.description || summary.overview,
        minPlayers: definition.metadata.minPlayers || 2,
        maxPlayers: definition.metadata.maxPlayers || 6,
        status: 'ready',
        pdfUrl: metadata.pdfUrl || null,
        generationMetadata: {
          summary,
          generatedAt: new Date().toISOString(),
          reviewedByUser: true,
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
    console.error('Error approving game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
