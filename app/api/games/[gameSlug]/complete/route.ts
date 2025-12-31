import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiGeneratedGames, gameDefinitions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { applyCorrections, validateGameDefinition } from '@/lib/ai/game-validator';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    const { uploadId, corrections } = await request.json();

    if (!uploadId || !corrections) {
      return NextResponse.json(
        { error: 'uploadId and corrections are required' },
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

    // Get the latest game definition
    const definitions = await db
      .select()
      .from(gameDefinitions)
      .where(eq(gameDefinitions.gameId, game.id))
      .orderBy(desc(gameDefinitions.version))
      .limit(1);

    if (definitions.length === 0) {
      return NextResponse.json(
        { error: 'Game definition not found' },
        { status: 404 }
      );
    }

    const currentDefinition = definitions[0].definition as any;

    // Apply user corrections
    const updatedDefinition = applyCorrections(currentDefinition, corrections);

    // Validate the updated definition
    const validation = validateGameDefinition(updatedDefinition);

    if (!validation.isComplete) {
      return NextResponse.json(
        {
          error: 'Definition still has issues after corrections',
          issues: validation.issues,
        },
        { status: 400 }
      );
    }

    // Save the updated definition as a new version
    await db.insert(gameDefinitions).values({
      gameId: game.id,
      definition: updatedDefinition,
      version: definitions[0].version + 1,
    });

    // Update the game status to 'ready'
    await db
      .update(aiGeneratedGames)
      .set({
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(aiGeneratedGames.id, game.id));

    return NextResponse.json({
      success: true,
      message: 'Game definition updated successfully',
    });
  } catch (error) {
    console.error('Error completing game setup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
