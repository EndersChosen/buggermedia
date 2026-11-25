import { Suspense } from 'react';
import { CreateScoreCardPage } from '@/features/create/CreateScoreCardPage';

export const metadata = { title: 'Create a score card · Card Game Score Tracker' };

export default function CreatePage() {
  return (
    <Suspense fallback={null}>
      <CreateScoreCardPage />
    </Suspense>
  );
}
