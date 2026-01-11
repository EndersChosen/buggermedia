'use client';

import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { useSpadesGame } from './useSpadesGame';
import { SpadesScoreBoard } from './components/SpadesScoreBoard';
import { SpadesScoreInput } from './components/SpadesScoreInput';

export function SpadesGame() {
  const { gameState, addHand, updateHand } = useSpadesGame();

  // Get the most recent hand for input
  const currentHand = gameState.hands[gameState.hands.length - 1];

  return (
    <div className="space-y-6">
      {/* Game Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">How to Play</h2>
        <p className="text-sm">
          Enter bids and tricks for each hand. <strong>Nil = 0 bid</strong>. Bag penalty triggers at 10 bags (-100 points).
        </p>
        <ul className="text-sm mt-2 space-y-1">
          <li>• <strong>Successful Nil (0 bid, 0 tricks):</strong> +100 points</li>
          <li>• <strong>Failed Nil:</strong> -100 points</li>
          <li>• <strong>Made Bid:</strong> bid × 10 + overtricks (bags)</li>
          <li>• <strong>Failed Bid:</strong> -bid × 10</li>
          <li>• <strong>10 Bags:</strong> -100 points (bags reset to 0)</li>
        </ul>
      </div>

      {/* Scoreboard */}
      {gameState.hands.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Score History</h2>
          <SpadesScoreBoard gameState={gameState} />
        </div>
      )}

      {/* Current Hand Input */}
      {currentHand && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <SpadesScoreInput
            hand={currentHand}
            onUpdate={(team, field, value) => 
              updateHand(currentHand.handNumber, team, field, value)
            }
          />
        </div>
      )}

      {/* Add Hand Button */}
      <div className="flex justify-center">
        <Button onClick={addHand} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          {gameState.hands.length === 0 ? 'Start First Hand' : 'Add Next Hand'}
        </Button>
      </div>

      {/* Winner Display */}
      {gameState.hands.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team A</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {gameState.totalScoreA}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {gameState.bagsA} bags
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team B</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {gameState.totalScoreB}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                {gameState.bagsB} bags
              </p>
            </div>
          </div>
          
          {gameState.totalScoreA >= 500 || gameState.totalScoreB >= 500 ? (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-lg font-bold">
                {gameState.totalScoreA > gameState.totalScoreB 
                  ? '🎉 Team A Wins!'
                  : gameState.totalScoreB > gameState.totalScoreA
                  ? '🎉 Team B Wins!'
                  : '🤝 Tie Game!'}
              </p>
            </div>
          ) : (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              First to 500 points wins!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
