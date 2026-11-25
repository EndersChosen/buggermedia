import { Suspense } from 'react';
import { GameSelectionPage } from '@/features/game-selection/GameSelectionPage';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <GameSelectionPage />
    </Suspense>
  );
}
