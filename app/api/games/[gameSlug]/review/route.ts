import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 });
    }

    // Get the upload log which contains the parsed definition in metadata
    const logs = await db
      .select()
      .from(uploadLogs)
      .where(eq(uploadLogs.id, uploadId))
      .limit(1);

    if (logs.length === 0) {
      return NextResponse.json({ error: 'Upload not found' }, { status: 404 });
    }

    const log = logs[0];
    const metadata = log.generationMetadata as any;

    if (!metadata?.parsedDefinition) {
      return NextResponse.json(
        { error: 'No parsed definition found for this upload' },
        { status: 404 }
      );
    }

    // Return a simplified view of the definition for review
    const definition = metadata.parsedDefinition;

    return NextResponse.json({
      gameSlug,
      definition: {
        name: definition.metadata.name,
        description: definition.metadata.description,
        minPlayers: definition.metadata.minPlayers,
        maxPlayers: definition.metadata.maxPlayers,
        teams: definition.metadata.teams,
        rounds: {
          type: definition.rounds.type,
          maxRounds: definition.rounds.maxRounds,
          fields: definition.rounds.fields.map((f: any) => ({
            id: f.id,
            label: f.label,
            type: f.type,
            perPlayer: f.perPlayer,
            perTeam: f.perTeam,
          })),
        },
        scoring: {
          formulas: definition.scoring.formulas.map((f: any) => ({
            name: f.name,
            description: f.description,
          })),
        },
        winCondition: {
          type: definition.winCondition.type,
          description: definition.winCondition.description,
          targetScore: definition.winCondition.targetScore,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching review data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
