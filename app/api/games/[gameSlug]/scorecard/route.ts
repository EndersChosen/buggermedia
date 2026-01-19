import { NextResponse } from 'next/server';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { aiGeneratedGames } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Database not configured. Set POSTGRES_URL / DATABASE_URL to fetch scorecards.',
        },
        { status: 503 }
      );
    }

    const db = getDb();
    const { gameSlug } = await params;

    // Fetch the game from database
    const games = await db
      .select({
        htmlScorecard: aiGeneratedGames.htmlScorecard,
        name: aiGeneratedGames.name,
      })
      .from(aiGeneratedGames)
      .where(eq(aiGeneratedGames.gameSlug, gameSlug))
      .limit(1);

    if (games.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = games[0];

    if (!game.htmlScorecard) {
      return NextResponse.json(
        { error: 'HTML scorecard not available for this game' },
        { status: 404 }
      );
    }

    // Return the HTML as an HTML response
    return new NextResponse(game.htmlScorecard, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error fetching scorecard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
