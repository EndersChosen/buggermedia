import { useState } from 'react';
import { CYAGameSession } from '@/@types/game.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';

interface CYAScoreBoardProps {
  game: CYAGameSession;
}

export function CYAScoreBoard({ game }: CYAScoreBoardProps) {
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getLeaderId = () => {
    const maxScore = Math.max(...Object.values(game.totalScores));
    return Object.entries(game.totalScores).find(([_, score]) => score === maxScore)?.[0];
  };

  const toggleRoundExpansion = (roundNumber: number) => {
    const newExpanded = new Set(expandedRounds);
    if (newExpanded.has(roundNumber)) {
      newExpanded.delete(roundNumber);
    } else {
      newExpanded.add(roundNumber);
    }
    setExpandedRounds(newExpanded);
  };

  const leaderId = getLeaderId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoreboard</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Target: {formatCurrency(game.targetScore)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Round</th>
                {game.players.map((player) => (
                  <th
                    key={player.id}
                    className="text-right py-2 px-2 font-semibold text-gray-700 dark:text-gray-300"
                  >
                    {player.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {game.rounds.map((round) => {
                const hasCardCollections = round.cardCollections && Object.keys(round.cardCollections).length > 0;
                const isExpanded = expandedRounds.has(round.roundNumber);

                return (
                  <>
                    <tr
                      key={round.roundNumber}
                      className={`border-b border-gray-100 dark:border-gray-700/50 ${hasCardCollections ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}`}
                      onClick={() => hasCardCollections && toggleRoundExpansion(round.roundNumber)}
                    >
                      <td className="py-2 px-2 text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          {round.roundNumber}
                          {hasCardCollections && (
                            isExpanded ?
                              <ChevronUp className="w-3 h-3 text-gray-400" /> :
                              <ChevronDown className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </td>
                      {game.players.map((player) => (
                        <td key={player.id} className="text-right py-2 px-2 text-gray-800 dark:text-gray-200">
                          {formatCurrency(round.scores[player.id] || 0)}
                        </td>
                      ))}
                    </tr>
                    {hasCardCollections && isExpanded && (
                      <tr key={`${round.roundNumber}-details`} className="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/50">
                        <td colSpan={game.players.length + 1} className="py-3 px-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {game.players.map((player) => {
                              const cards = round.cardCollections?.[player.id];
                              if (!cards || Object.keys(cards).length === 0) return null;

                              return (
                                <div key={player.id} className="space-y-1">
                                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
                                    {player.name}
                                  </h4>
                                  <div className="space-y-1 text-xs">
                                    {Object.entries(cards).map(([cardName, count]) => (
                                      <div key={cardName} className="flex justify-between text-gray-700 dark:text-gray-300">
                                        <span>{cardName}</span>
                                        <span>× {count}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold bg-gray-50 dark:bg-gray-700/50">
                <td className="py-3 px-2 text-gray-900 dark:text-white">Total</td>
                {game.players.map((player) => (
                  <td key={player.id} className="text-right py-3 px-2">
                    <div className="flex items-center justify-end gap-2">
                      {player.id === leaderId && (
                        <Trophy className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                      )}
                      <span className="text-gray-900 dark:text-white">
                        {formatCurrency(game.totalScores[player.id] || 0)}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {game.rounds.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No rounds played yet. Enter scores to begin!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
