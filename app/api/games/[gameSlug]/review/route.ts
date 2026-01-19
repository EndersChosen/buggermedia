import { NextResponse } from 'next/server';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { uploadLogs } from '@/lib/db/schema';
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
            'Database not configured. Set POSTGRES_URL / DATABASE_URL to review games.',
        },
        { status: 503 }
      );
    }

    const db = getDb();
    const { gameSlug } = await params;
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 });
    }

    // Fetch upload log with generation metadata
    const uploads = await db
      .select()
      .from(uploadLogs)
      .where(eq(uploadLogs.id, uploadId))
      .limit(1);

    if (uploads.length === 0) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const upload = uploads[0];
    const metadata = upload.generationMetadata as any;

    if (!metadata) {
      return NextResponse.json({ error: 'No generation metadata found' }, { status: 404 });
    }

    // Return a simplified definition based on the summary
    // Since we're using HTML-only generation now, we don't have the full JSON definition
    const summary = metadata.parsedSummary;

    const simplifiedDefinition = {
      name: summary.gameName,
      description: summary.overview,
      minPlayers: summary.minPlayers,
      maxPlayers: summary.maxPlayers,
      rounds: {
        type: summary.rounds.type,
        maxRounds: summary.rounds.count,
        fields: [], // HTML scorecard handles this
      },
      scoring: {
        formulas: [
          {
            name: 'Score Calculation',
            description: summary.scoringOverview,
          },
        ],
      },
      winCondition: {
        type: 'custom',
        description: summary.winCondition,
      },
    };

    return NextResponse.json({
      definition: simplifiedDefinition,
      hasHtmlScorecard: !!metadata.parsedHtmlScorecard,
    });
  } catch (error) {
    console.error('Error fetching game review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
