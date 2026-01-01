import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/lib/db';
import { uploadLogs } from '@/lib/db/schema';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type');

    // Check if this is a text submission or file upload
    if (contentType?.includes('application/json')) {
      // Text-based submission
      const { rulesText, gameName, aiModel } = await request.json();

      if (!rulesText || !gameName) {
        return NextResponse.json(
          { error: 'Game name and rules text are required' },
          { status: 400 }
        );
      }

      if (rulesText.length < 100) {
        return NextResponse.json(
          { error: 'Rules text must be at least 100 characters' },
          { status: 400 }
        );
      }

      // Create upload log record
      const [uploadLog] = await db
        .insert(uploadLogs)
        .values({
          status: 'started',
          uploadTimestamp: new Date(),
        })
        .returning();

      // Trigger AI processing asynchronously (fire-and-forget)
      const url = new URL(request.url);
      const appUrl = `${url.protocol}//${url.host}`;
      fetch(`${appUrl}/api/ai/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadLog.id,
          rulesText,
          gameName,
          aiModel,
          reviewMode: true,
        }),
      }).catch((error) => {
        console.error('Failed to trigger AI processing:', error);
      });

      return NextResponse.json({
        uploadId: uploadLog.id,
        status: 'processing',
        estimatedTime: 30, // seconds
        message: 'Rules text submitted. AI processing started.',
      });
    } else {
      // File upload
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const aiModel = formData.get('aiModel') as string | null;

      // Validate file
      if (!file) {
        return NextResponse.json(
          { error: 'No file provided' },
          { status: 400 }
        );
      }

      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'File must be a PDF' },
          { status: 400 }
        );
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'File size must be less than 10MB' },
          { status: 400 }
        );
      }

      // Upload to Vercel Blob
      const blob = await put(`rules/${Date.now()}-${file.name}`, file, {
        access: 'public',
      });

      // Create upload log record
      const [uploadLog] = await db
        .insert(uploadLogs)
        .values({
          status: 'started',
          uploadTimestamp: new Date(),
        })
        .returning();

      // Trigger AI processing asynchronously (fire-and-forget)
      const url = new URL(request.url);
      const appUrl = `${url.protocol}//${url.host}`;
      fetch(`${appUrl}/api/ai/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadLog.id,
          pdfUrl: blob.url,
          aiModel,
          reviewMode: true,
        }),
      }).catch((error) => {
        console.error('Failed to trigger AI processing:', error);
      });

      return NextResponse.json({
        uploadId: uploadLog.id,
        status: 'processing',
        estimatedTime: 60, // seconds
        message: 'PDF uploaded successfully. AI processing started.',
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}
