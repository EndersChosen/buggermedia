import { NextResponse } from 'next/server';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { aiGeneratedGames, gameDefinitions, gameRules } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Database not configured. Set POSTGRES_URL / DATABASE_URL to fetch AI-generated game definitions.',
        },
        { status: 503 }
      );
    }

    const db = getDb();
    const { gameSlug } = await params;

    // Find the game
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

    // Get the game definition (latest version)
    const definitions = await db
      .select()
      .from(gameDefinitions)
      .where(eq(gameDefinitions.gameId, game.id))
      .orderBy(desc(gameDefinitions.version))
      .limit(1);

    // Get the game rules
    const rules = await db
      .select()
      .from(gameRules)
      .where(eq(gameRules.gameId, game.id))
      .limit(1);

    return NextResponse.json({
      metadata: {
        id: game.gameSlug,
        name: game.name,
        description: game.description,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        source: 'ai-generated',
      },
      definition: definitions[0]?.definition || null,
      rules: rules[0]?.rules || null,
    });
  } catch (error) {
    console.error('Error fetching game definition:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
