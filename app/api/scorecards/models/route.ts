import { NextResponse } from 'next/server';
import { DEFAULT_MODEL, listModels } from '@/lib/ai/models';

export const dynamic = 'force-dynamic';

export function GET() {
  const models = listModels();
  const preferred = models.find((m) => m.id === DEFAULT_MODEL && m.available) ?? models.find((m) => m.available);
  return NextResponse.json({ models, defaultModel: preferred?.id ?? null });
}
