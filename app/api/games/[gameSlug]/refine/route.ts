import { NextResponse } from 'next/server';
import { getDb, isDatabaseConfigured } from '@/lib/db';
import { uploadLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateHTMLScorecardOnly } from '@/lib/ai/game-generator';
import { getAIProvider } from '@/lib/ai/providers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Database not configured. Set POSTGRES_URL / DATABASE_URL to refine games.',
        },
        { status: 503 }
      );
    }

    const db = getDb();
    const { gameSlug } = await params;
    const body = await request.json();
    const { uploadId, feedback } = body;

    if (!uploadId || !feedback) {
      return NextResponse.json(
        { error: 'Missing uploadId or feedback' },
        { status: 400 }
      );
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

    if (!metadata || !metadata.originalRulesText) {
      return NextResponse.json(
        { error: 'Original rules text not found' },
        { status: 400 }
      );
    }

    // Regenerate with feedback appended to the rules
    const rulesWithFeedback = `${metadata.originalRulesText}\n\nUSER FEEDBACK:\n${feedback}`;
    const aiModel = metadata.aiModel || 'gpt-5.2';

    console.log('[Refine] Regenerating game with user feedback');

    const { summary, htmlScorecard } = await generateHTMLScorecardOnly(
      rulesWithFeedback,
      metadata.parsedSummary?.gameName,
      aiModel
    );

    // Update metadata with new versions
    await db
      .update(uploadLogs)
      .set({
        generationMetadata: {
          ...metadata,
          parsedSummary: summary,
          parsedHtmlScorecard: htmlScorecard,
          refinedAt: new Date().toISOString(),
          userFeedback: feedback,
        },
      })
      .where(eq(uploadLogs.id, uploadId));

    // Return simplified definition for display
    const simplifiedDefinition = {
      name: summary.gameName,
      description: summary.overview,
      minPlayers: summary.minPlayers,
      maxPlayers: summary.maxPlayers,
      rounds: {
        type: summary.rounds.type,
        maxRounds: summary.rounds.count,
        fields: [],
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
      success: true,
      definition: simplifiedDefinition,
    });
  } catch (error) {
    console.error('Error refining game:', error);
    return NextResponse.json(
      {
        error: 'Failed to refine game',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
