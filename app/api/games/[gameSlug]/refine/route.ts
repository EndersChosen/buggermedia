import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { uploadLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getRefinementPrompt } from '@/lib/ai/prompts';
import { AIModel, getAIProvider } from '@/lib/ai/providers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameSlug: string }> }
) {
  try {
    const { gameSlug } = await params;
    const { uploadId, feedback } = await request.json();

    if (!uploadId || !feedback?.trim()) {
      return NextResponse.json(
        { error: 'Missing uploadId or feedback' },
        { status: 400 }
      );
    }

    // Get the upload log with current parsed definition
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

    if (!metadata?.parsedDefinition || !metadata?.originalRulesText) {
      return NextResponse.json(
        { error: 'Missing parsed definition or original rules' },
        { status: 404 }
      );
    }

    const currentDefinition = metadata.parsedDefinition;
    const rulesText = metadata.originalRulesText;
    const summary = metadata.parsedSummary;
    const aiModel: AIModel = metadata.aiModel || 'claude-sonnet-4';

    console.log('[Refine] 🔄 Refining game definition with user feedback');
    console.log('[Refine] 📝 Feedback:', feedback);
    console.log('[Refine] 🤖 Using AI model:', aiModel);

    // Get AI provider and call with refinement prompt
    const provider = getAIProvider(aiModel);
    const refinementPrompt = getRefinementPrompt(
      rulesText,
      currentDefinition,
      summary,
      feedback
    );

    const responseText = await provider.generateCompletion(refinementPrompt);

    // Parse the refined definition
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const refinedDefinition = JSON.parse(jsonMatch[1]);

    console.log('[Refine] ✅ Successfully refined definition');
    console.log('[Refine] 📊 Updated metadata:', {
      name: refinedDefinition.metadata?.name,
      teams: refinedDefinition.metadata?.teams,
      rounds: refinedDefinition.rounds?.fields?.length,
    });

    // Update upload log metadata with refined definition
    await db
      .update(uploadLogs)
      .set({
        generationMetadata: {
          ...metadata,
          parsedDefinition: refinedDefinition,
          lastRefinedAt: new Date().toISOString(),
          refinementHistory: [
            ...(metadata.refinementHistory || []),
            {
              feedback,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      })
      .where(eq(uploadLogs.id, uploadId));

    // Return simplified view for display
    return NextResponse.json({
      success: true,
      definition: {
        name: refinedDefinition.metadata.name,
        description: refinedDefinition.metadata.description,
        minPlayers: refinedDefinition.metadata.minPlayers,
        maxPlayers: refinedDefinition.metadata.maxPlayers,
        teams: refinedDefinition.metadata.teams,
        rounds: {
          type: refinedDefinition.rounds.type,
          fields: refinedDefinition.rounds.fields.map((f: any) => ({
            id: f.id,
            label: f.label,
            type: f.type,
            perPlayer: f.perPlayer,
            perTeam: f.perTeam,
            helperText: f.helperText,
          })),
        },
        scoring: {
          formulas: refinedDefinition.scoring.formulas.map((f: any) => ({
            name: f.name,
            description: f.description,
            aggregateTeam: f.aggregateTeam,
          })),
        },
        winCondition: {
          type: refinedDefinition.winCondition.type,
          description: refinedDefinition.winCondition.description,
          unit: refinedDefinition.winCondition.unit,
        },
      },
    });
  } catch (error) {
    console.error('[Refine] ❌ Error refining game:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to refine game definition',
      },
      { status: 500 }
    );
  }
}
