import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { aiGeneratedGames } from '@/lib/db/schema';

/**
 * Serves legacy AI-written HTML score cards.
 *
 * That HTML (and its scripts) was written by a model from user-supplied rules,
 * so it is treated as untrusted: the CSP `sandbox` directive gives it an opaque
 * origin even if someone opens this URL directly, so it can't read this site's
 * storage or cookies, and it may not load any external resources.
 */
const SANDBOX_CSP = [
  'sandbox allow-scripts allow-forms',
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data:',
  "font-src 'none'",
  "connect-src 'none'",
  "form-action 'none'",
  "frame-ancestors 'self'",
].join('; ');

export async function GET(_request: Request, { params }: { params: Promise<{ gameSlug: string }> }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Shared library unavailable (database not configured).' }, { status: 503 });
  }

  try {
    const db = getDb();
    const { gameSlug } = await params;

    const games = await db
      .select({ htmlScorecard: aiGeneratedGames.htmlScorecard })
      .from(aiGeneratedGames)
      .where(eq(aiGeneratedGames.gameSlug, gameSlug))
      .limit(1);

    if (games.length === 0 || !games[0].htmlScorecard) {
      return NextResponse.json({ error: 'Score card not found' }, { status: 404 });
    }

    return new NextResponse(games[0].htmlScorecard, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': SANDBOX_CSP,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error fetching scorecard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
