'use client';

import type { DynamicGameDefinition } from '@/lib/types/dynamic-game.types';
import { Card } from '@/components/ui/Card';

interface DynamicRoundTrackerProps {
  definition: DynamicGameDefinition;
  currentRound: number;
  completedRounds: number;
}

export function DynamicRoundTracker({
  definition,
  currentRound,
  completedRounds,
}: DynamicRoundTrackerProps) {
  const { rounds } = definition;

  // Determine total rounds
  let totalRounds: number | null = null;
  let roundsLabel = '';

  if (rounds.type === 'fixed') {
    totalRounds = rounds.count;
    roundsLabel = `Round ${currentRound} of ${totalRounds}`;
  } else {
    roundsLabel = `Round ${currentRound}`;
  }

  // Calculate progress percentage
  const progressPercent = totalRounds
    ? Math.round((completedRounds / totalRounds) * 100)
    : 0;

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Game Progress
          </h3>
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {roundsLabel}
          </span>
        </div>

        {/* Progress Bar (only for fixed rounds) */}
        {totalRounds && (
          <div className="mt-3">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
              {completedRounds} / {totalRounds} rounds completed
            </p>
          </div>
        )}

        {/* Variable rounds info */}
        {rounds.type === 'variable' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {completedRounds} rounds completed • Game continues until win condition is met
          </p>
        )}
      </div>
    </Card>
  );
}
