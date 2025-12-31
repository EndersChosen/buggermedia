import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiGeneratedGames, gameDefinitions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { DynamicGameDefinition } from '@/lib/types/dynamic-game.types';
import { validateGameDefinition } from '@/lib/ai/game-validator';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    const { updates } = await request.json();

    // Find the game
    const games = await db
      .select()
      .from(aiGeneratedGames)
      .where(eq(aiGeneratedGames.gameSlug, gameSlug))
      .limit(1);

    if (games.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = games[0];

    // Get the latest definition
    const definitions = await db
      .select()
      .from(gameDefinitions)
      .where(eq(gameDefinitions.gameId, game.id))
      .orderBy(desc(gameDefinitions.version))
      .limit(1);

    if (definitions.length === 0) {
      return NextResponse.json({ error: 'Game definition not found' }, { status: 404 });
    }

    const currentDefinition = definitions[0].definition as DynamicGameDefinition;

    // Apply updates to the definition
    const updatedDefinition: DynamicGameDefinition = {
      ...currentDefinition,
      metadata: {
        ...currentDefinition.metadata,
        ...updates.metadata,
      },
      rounds: updates.rounds !== undefined ? updates.rounds : currentDefinition.rounds,
      scoring: updates.scoring !== undefined ? updates.scoring : currentDefinition.scoring,
      validation: updates.validation !== undefined ? updates.validation : currentDefinition.validation,
      winCondition: updates.winCondition !== undefined ? updates.winCondition : currentDefinition.winCondition,
      ui: updates.ui !== undefined ? updates.ui : currentDefinition.ui,
    };

    // Validate the updated definition
    const validation = validateGameDefinition(updatedDefinition);

    if (!validation.isComplete) {
      return NextResponse.json(
        { error: 'Updated definition is incomplete', issues: validation.issues },
        { status: 400 }
      );
    }

    // Save the new version
    await db.insert(gameDefinitions).values({
      gameId: game.id,
      definition: updatedDefinition,
      version: definitions[0].version + 1,
      createdAt: new Date(),
    });

    // Update the game metadata if changed
    if (updates.metadata) {
      await db
        .update(aiGeneratedGames)
        .set({
          name: updates.metadata.name || game.name,
          description: updates.metadata.description || game.description,
          minPlayers: updates.metadata.minPlayers || game.minPlayers,
          maxPlayers: updates.metadata.maxPlayers || game.maxPlayers,
          status: 'ready',
        })
        .where(eq(aiGeneratedGames.id, game.id));
    }

    return NextResponse.json({
      success: true,
      message: 'Game updated successfully',
      version: definitions[0].version + 1,
    });
  } catch (error) {
    console.error('Error updating game:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
