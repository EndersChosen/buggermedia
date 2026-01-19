import { NextResponse } from 'next/server';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { aiGeneratedGames, gameDefinitions, gameRules } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { GAME_REGISTRY } from '@/features/game-selection/gameRegistry';

export async function GET() {
  // Allow local dev without a database configured.
  if (!isDatabaseConfigured()) {
    const hardcoded = Object.values(GAME_REGISTRY).map((game) => ({
      ...game,
      source: 'hardcoded' as const,
    }));

    return NextResponse.json({
      hardcoded,
      aiGenerated: [],
      combined: hardcoded,
      warning:
        'Database not configured. Set POSTGRES_URL / DATABASE_URL to enable AI-generated games.',
    });
  }

  try {
    const db = getDb();

    // Get hardcoded games
    const hardcoded = Object.values(GAME_REGISTRY).map((game) => ({
      ...game,
      source: 'hardcoded' as const,
    }));

    // Get AI-generated games from database
    const aiGames = await db
      .select({
        id: aiGeneratedGames.id,
        gameSlug: aiGeneratedGames.gameSlug,
        name: aiGeneratedGames.name,
        description: aiGeneratedGames.description,
        minPlayers: aiGeneratedGames.minPlayers,
        maxPlayers: aiGeneratedGames.maxPlayers,
        status: aiGeneratedGames.status,
        createdAt: aiGeneratedGames.createdAt,
      })
      .from(aiGeneratedGames)
      .where(eq(aiGeneratedGames.status, 'ready'));

    // Transform AI games to match GameDefinition format
    const aiGeneratedFormatted = aiGames.map((game) => ({
      id: game.gameSlug,
      name: game.name,
      description: game.description,
      minPlayers: game.minPlayers,
      maxPlayers: game.maxPlayers,
      source: 'ai-generated' as const,
      // Rules will be fetched separately when needed
      rules: {
        overview: '',
        quickReference: [],
        fullRules: { sections: [] },
      },
    }));

    return NextResponse.json({
      hardcoded,
      aiGenerated: aiGeneratedFormatted,
      combined: [...hardcoded, ...aiGeneratedFormatted],
    });
  } catch (error) {
    console.error('Error fetching games:', error);

    // If database is not set up yet, return only hardcoded games
    const hardcoded = Object.values(GAME_REGISTRY).map((game) => ({
      ...game,
      source: 'hardcoded' as const,
    }));

    return NextResponse.json({
      hardcoded,
      aiGenerated: [],
      combined: hardcoded,
      warning: 'Database not configured. Showing only hardcoded games.',
    });
  }
}
