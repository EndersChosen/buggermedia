import { CYAGameSession } from '@/@types/game.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Trophy } from 'lucide-react';

interface CYAScoreBoardProps {
  game: CYAGameSession;
}

export function CYAScoreBoard({ game }: CYAScoreBoardProps) {
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

  const leaderId = getLeaderId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoreboard</CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Target: {formatCurrency(game.targetScore)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-2 font-semibold text-gray-700">Round</th>
                {game.players.map((player) => (
                  <th
                    key={player.id}
                    className="text-right py-2 px-2 font-semibold text-gray-700"
                  >
                    {player.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {game.rounds.map((round) => (
                <tr key={round.roundNumber} className="border-b border-gray-100">
                  <td className="py-2 px-2 text-gray-600">{round.roundNumber}</td>
                  {game.players.map((player) => (
                    <td key={player.id} className="text-right py-2 px-2 text-gray-800">
                      {formatCurrency(round.scores[player.id] || 0)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 font-semibold bg-gray-50">
                <td className="py-3 px-2 text-gray-900">Total</td>
                {game.players.map((player) => (
                  <td key={player.id} className="text-right py-3 px-2">
                    <div className="flex items-center justify-end gap-2">
                      {player.id === leaderId && (
                        <Trophy className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-gray-900">
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
          <div className="text-center py-8 text-gray-500">
            No rounds played yet. Enter scores to begin!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
