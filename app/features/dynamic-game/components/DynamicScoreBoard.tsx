'use client';

import type { DynamicGameDefinition, DynamicRoundData } from '@/lib/types/dynamic-game.types';
import { Card } from '@/components/ui/Card';

interface DynamicScoreBoardProps {
  definition: DynamicGameDefinition;
  players: Array<{ id: string; name: string }>;
  rounds: DynamicRoundData[];
  totalScores: Record<string, number>;
  winner?: { playerId: string; score: number };
}

export function DynamicScoreBoard({
  definition,
  players,
  rounds,
  totalScores,
  winner,
}: DynamicScoreBoardProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = totalScores[a.id] ?? 0;
    const scoreB = totalScores[b.id] ?? 0;

    // Sort based on win condition type
    if (definition.winCondition.type === 'lowest-score') {
      return scoreA - scoreB;
    }
    return scoreB - scoreA; // Default: highest score first
  });

  return (
    <Card>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scoreboard</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Player
              </th>
              {rounds.map((round) => (
                <th
                  key={round.roundNumber}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  R{round.roundNumber}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedPlayers.map((player, index) => {
              const isWinner = winner?.playerId === player.id;
              const totalScore = totalScores[player.id] ?? 0;

              return (
                <tr
                  key={player.id}
                  className={`${
                    isWinner
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {/* Rank */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {index + 1}
                      </span>
                      {index === 0 && !winner && (
                        <span className="text-yellow-500">🥇</span>
                      )}
                      {isWinner && (
                        <span className="text-green-500">👑</span>
                      )}
                    </div>
                  </td>

                  {/* Player Name */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {player.name}
                    </div>
                  </td>

                  {/* Round Scores */}
                  {rounds.map((round) => {
                    const roundScore = round.roundScores?.[player.id] ?? 0;
                    return (
                      <td
                        key={round.roundNumber}
                        className="px-4 py-3 whitespace-nowrap text-center"
                      >
                        <span
                          className={`text-sm font-medium ${
                            roundScore > 0
                              ? 'text-green-600 dark:text-green-400'
                              : roundScore < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {roundScore > 0 ? '+' : ''}
                          {roundScore}
                        </span>
                      </td>
                    );
                  })}

                  {/* Total Score */}
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {totalScore}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Winner Banner */}
      {winner && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
          <div className="text-center">
            <span className="text-2xl">🎉</span>
            <p className="text-lg font-bold text-green-800 dark:text-green-300 mt-2">
              {players.find((p) => p.id === winner.playerId)?.name} wins with {winner.score} points!
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
