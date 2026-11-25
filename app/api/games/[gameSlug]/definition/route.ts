import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { aiGeneratedGames, gameDefinitions } from '@/lib/db/schema';
import { validateScoreCard } from '@/lib/scorecard/validate';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ gameSlug: string }> }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Shared library unavailable (database not configured).' }, { status: 503 });
  }

  try {
    const db = getDb();
    const { gameSlug } = await params;

    const games = await db.select().from(aiGeneratedGames).where(eq(aiGeneratedGames.gameSlug, gameSlug)).limit(1);
    if (games.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    const game = games[0];

    const definitions = await db
      .select()
      .from(gameDefinitions)
      .where(eq(gameDefinitions.gameId, game.id))
      .orderBy(desc(gameDefinitions.version))
      .limit(1);

    const validated = definitions[0] ? validateScoreCard(definitions[0].definition) : null;

    return NextResponse.json({
      metadata: {
        id: game.gameSlug,
        name: game.name,
        description: game.description,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        source: 'ai-generated',
      },
      card: validated?.ok ? validated.card : null,
      legacy: !validated?.ok,
      hasLegacyHtml: Boolean(game.htmlScorecard),
    });
  } catch (error) {
    console.error('Error fetching game definition:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
