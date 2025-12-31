import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiGeneratedGames, gameDefinitions, uploadLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateGameDefinition } from '@/lib/ai/game-validator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json(
        { error: 'uploadId is required' },
        { status: 400 }
      );
    }

    // Find the game by slug
    const games = await db
      .select()
      .from(aiGeneratedGames)
      .where(eq(aiGeneratedGames.gameSlug, gameSlug))
      .limit(1);

    if (games.length === 0) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const game = games[0];

    // Get the game definition
    const definitions = await db
      .select()
      .from(gameDefinitions)
      .where(eq(gameDefinitions.gameId, game.id))
      .orderBy(gameDefinitions.version)
      .limit(1);

    if (definitions.length === 0) {
      return NextResponse.json(
        { error: 'Game definition not found' },
        { status: 404 }
      );
    }

    const definition = definitions[0].definition as any;

    // Validate the definition
    const validation = validateGameDefinition(definition);

    return NextResponse.json({
      gameName: game.name,
      gameSlug: game.gameSlug,
      issues: validation.issues,
      isComplete: validation.isComplete,
    });
  } catch (error) {
    console.error('Error validating game:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
