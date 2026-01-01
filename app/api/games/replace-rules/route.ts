import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { aiGeneratedGames, gameDefinitions, uploadLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { put } from '@vercel/blob';
import pdf from 'pdf-parse';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type');
    let gameSlug: string;
    let rulesText: string;
    let gameName: string | null = null;
    let aiModel: string | null = null;

    // Handle file upload
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      gameSlug = formData.get('gameSlug') as string;
      aiModel = formData.get('aiModel') as string | null;

      if (!file || !gameSlug) {
        return NextResponse.json({ error: 'Missing file or gameSlug' }, { status: 400 });
      }

      // Validate file type and size
      if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
      }

      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 });
      }

      // Extract text from PDF
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfData = await pdf(buffer);
        rulesText = pdfData.text;

        if (!rulesText || rulesText.trim().length < 100) {
          return NextResponse.json(
            { error: 'PDF text extraction failed or content is too short' },
            { status: 400 }
          );
        }
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        return NextResponse.json({ error: 'Failed to parse PDF file' }, { status: 400 });
      }
    }
    // Handle text input
    else {
      const body = await request.json();
      gameSlug = body.gameSlug;
      rulesText = body.rulesText;
      gameName = body.gameName;
      aiModel = body.aiModel;

      if (!gameSlug || !rulesText || !gameName) {
        return NextResponse.json(
          { error: 'Missing gameSlug, rulesText, or gameName' },
          { status: 400 }
        );
      }
    }

    // Find the existing game
    const games = await db
      .select()
      .from(aiGeneratedGames)
      .where(eq(aiGeneratedGames.gameSlug, gameSlug))
      .limit(1);

    if (games.length === 0) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = games[0];

    // Trigger AI regeneration in background
    // We'll call the existing AI processing endpoint
    const aiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ai/process`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rulesText,
          gameName: gameName || game.name,
          existingGameSlug: gameSlug, // Pass this to update existing game instead of creating new
          aiModel,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      throw new Error(errorData.error || 'AI processing failed');
    }

    const result = await aiResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Game rules have been successfully replaced and regenerated',
      gameSlug: result.gameSlug,
    });
  } catch (error) {
    console.error('Error replacing game rules:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
