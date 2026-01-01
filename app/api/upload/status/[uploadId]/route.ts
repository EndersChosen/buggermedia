import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadLogs, aiGeneratedGames } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params;

    // Find the upload log
    const logs = await db
      .select()
      .from(uploadLogs)
      .where(eq(uploadLogs.id, uploadId))
      .limit(1);

    if (logs.length === 0) {
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      );
    }

    const log = logs[0];

    // Calculate progress based on status
    const progressMap = {
      started: 10,
      pdf_parsed: 30,
      ai_processing: 60,
      awaiting_review: 90,
      completed: 100,
      failed: 0,
    };

    const progress = progressMap[log.status as keyof typeof progressMap] || 0;

    // If awaiting review, fetch the game slug from metadata
    let gameSlug: string | null = null;
    let needsCompletion = false;
    let needsReview = false;

    if (log.status === 'awaiting_review') {
      const metadata = log.generationMetadata as any;
      gameSlug = metadata?.gameSlug || null;
      needsReview = true;
      needsCompletion = metadata?.needsCompletion || false;
    } else if (log.status === 'completed' && log.gameId) {
      // If completed, fetch the game slug and completion status
      const games = await db
        .select({
          gameSlug: aiGeneratedGames.gameSlug,
          generationMetadata: aiGeneratedGames.generationMetadata,
        })
        .from(aiGeneratedGames)
        .where(eq(aiGeneratedGames.id, log.gameId))
        .limit(1);

      if (games.length > 0) {
        gameSlug = games[0].gameSlug;
        const metadata = games[0].generationMetadata as any;
        needsCompletion = metadata?.needsCompletion || false;
      }
    }

    return NextResponse.json({
      status: log.status,
      progress,
      gameSlug,
      needsCompletion,
      needsReview,
      error: log.errorMessage || undefined,
    });
  } catch (error) {
    console.error('Error fetching upload status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
