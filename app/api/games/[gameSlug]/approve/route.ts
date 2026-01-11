import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadLogs, aiGeneratedGames } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import slugify from 'slugify';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    const body = await request.json();
    const { uploadId } = body;

    if (!uploadId) {
      return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 });
    }

    // Fetch upload log with generation metadata
    const uploads = await db
      .select()
      .from(uploadLogs)
      .where(eq(uploadLogs.id, uploadId))
      .limit(1);

    if (uploads.length === 0) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const upload = uploads[0];
    const metadata = upload.generationMetadata as any;

    if (!metadata || !metadata.parsedSummary || !metadata.parsedHtmlScorecard) {
      return NextResponse.json(
        { error: 'Incomplete generation metadata' },
        { status: 400 }
      );
    }

    const summary = metadata.parsedSummary;
    const htmlScorecard = metadata.parsedHtmlScorecard;

    // Check for slug conflicts
    let finalSlug = gameSlug;
    let counter = 1;

    while (true) {
      const existing = await db
        .select()
        .from(aiGeneratedGames)
        .where(eq(aiGeneratedGames.gameSlug, finalSlug))
        .limit(1);

      if (existing.length === 0) break;

      const baseSlug = slugify(summary.gameName, { lower: true, strict: true });
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create game record
    const [game] = await db
      .insert(aiGeneratedGames)
      .values({
        gameSlug: finalSlug,
        name: summary.gameName,
        description: summary.overview,
        minPlayers: summary.minPlayers || 2,
        maxPlayers: summary.maxPlayers || 6,
        status: 'ready',
        pdfUrl: metadata.pdfUrl,
        htmlScorecard,
        generationMetadata: {
          summary,
          generatedAt: metadata.generatedAt,
          aiModel: metadata.aiModel,
        },
      })
      .returning();

    // Update upload log status
    await db
      .update(uploadLogs)
      .set({
        status: 'completed',
        gameId: game.id,
      })
      .where(eq(uploadLogs.id, uploadId));

    return NextResponse.json({
      success: true,
      gameSlug: finalSlug,
      gameId: game.id,
    });
  } catch (error) {
    console.error('Error approving game:', error);
    return NextResponse.json(
      {
        error: 'Failed to approve game',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
