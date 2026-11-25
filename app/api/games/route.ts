import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import slugify from 'slugify';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { aiGeneratedGames, gameDefinitions } from '@/lib/db/schema';
import { GAME_REGISTRY } from '@/features/game-selection/gameRegistry';
import { validateScoreCard } from '@/lib/scorecard/validate';
import { checkRateLimit, clientKey, formatWait, RATE_LIMITS } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

const DB_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms = DB_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Database timed out')), ms)),
  ]);
}

function hardcodedGames() {
  return Object.values(GAME_REGISTRY).map((game) => ({ ...game, source: 'hardcoded' as const }));
}

const emptyRules = { overview: '', setup: [], gameplay: [], scoring: [], winning: '' };

export async function GET() {
  const hardcoded = hardcodedGames();

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      hardcoded,
      aiGenerated: [],
      combined: hardcoded,
      warning: 'Shared library unavailable (database not configured).',
    });
  }

  try {
    const db = getDb();
    const [games, structured] = await withTimeout(
      Promise.all([
        db
          .select({
            id: aiGeneratedGames.id,
            gameSlug: aiGeneratedGames.gameSlug,
            name: aiGeneratedGames.name,
            description: aiGeneratedGames.description,
            minPlayers: aiGeneratedGames.minPlayers,
            maxPlayers: aiGeneratedGames.maxPlayers,
            hasHtml: sql<boolean>`${aiGeneratedGames.htmlScorecard} is not null`,
          })
          .from(aiGeneratedGames)
          .where(eq(aiGeneratedGames.status, 'ready')),
        db
          .selectDistinct({
            gameId: gameDefinitions.gameId,
            theme: sql<string | null>`${gameDefinitions.definition}->>'theme'`,
          })
          .from(gameDefinitions)
          .where(sql`${gameDefinitions.definition}->>'schemaVersion' = '2'`),
      ])
    );

    const withCard = new Set(structured.map((s) => s.gameId));
    const themes = new Map(structured.map((s) => [s.gameId, s.theme]));
    const aiGenerated = games
      .filter((g) => withCard.has(g.id) || g.hasHtml)
      .map((g) => ({
        id: g.gameSlug,
        name: g.name,
        description: g.description,
        minPlayers: g.minPlayers,
        maxPlayers: g.maxPlayers,
        source: 'ai-generated' as const,
        legacy: !withCard.has(g.id),
        theme: themes.get(g.id) ?? null,
        rules: emptyRules,
      }));

    return NextResponse.json({ hardcoded, aiGenerated, combined: [...hardcoded, ...aiGenerated] });
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({
      hardcoded,
      aiGenerated: [],
      combined: hardcoded,
      warning: 'Shared library is temporarily unavailable.',
    });
  }
}

/** Publish a validated score card to the shared library. */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Publishing is unavailable: the shared library database is not configured.' },
      { status: 503 }
    );
  }

  const wait = await checkRateLimit(RATE_LIMITS.publish, clientKey(request));
  if (wait > 0) {
    return NextResponse.json(
      { error: `Too many games published from this connection. Try again in ${formatWait(wait)}.` },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );
  }

  const body = await request.json().catch(() => null);
  const result = validateScoreCard(body?.card);
  if (!result.ok || !result.card) {
    return NextResponse.json({ error: 'That score card is not valid.', details: result.errors }, { status: 400 });
  }
  const card = result.card;

  try {
    const db = getDb();
    const baseSlug = slugify(card.name, { lower: true, strict: true }).slice(0, 80) || 'game';
    const reserved = new Set(Object.keys(GAME_REGISTRY));

    let slug = baseSlug;
    for (let n = 1; ; n++) {
      if (!reserved.has(slug) && !slug.startsWith('custom-')) {
        const existing = await withTimeout(
          db.select({ id: aiGeneratedGames.id }).from(aiGeneratedGames).where(eq(aiGeneratedGames.gameSlug, slug)).limit(1)
        );
        if (existing.length === 0) break;
      }
      slug = `${baseSlug}-${n + 1}`;
      if (n > 50) throw new Error('Could not find a free slug');
    }

    const [game] = await withTimeout(
      db
        .insert(aiGeneratedGames)
        .values({
          gameSlug: slug,
          name: card.name,
          description: card.description,
          minPlayers: card.minPlayers,
          maxPlayers: card.maxPlayers,
          status: 'ready',
          generationMetadata: { schemaVersion: 2, publishedAt: new Date().toISOString() },
        })
        .returning()
    );

    try {
      await withTimeout(db.insert(gameDefinitions).values({ gameId: game.id, definition: card, version: 1 }));
    } catch (error) {
      await db.delete(aiGeneratedGames).where(eq(aiGeneratedGames.id, game.id)).catch(() => {});
      throw error;
    }

    return NextResponse.json({ success: true, gameSlug: slug });
  } catch (error) {
    console.error('Error publishing game:', error);
    return NextResponse.json({ error: 'Could not publish the game. Please try again.' }, { status: 500 });
  }
}
