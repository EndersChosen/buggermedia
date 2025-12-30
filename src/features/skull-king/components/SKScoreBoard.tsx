import { SKGameSession, Player } from '@/@types/game.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Trophy, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SKScoreBoardProps {
  game: SKGameSession;
  onEditRound?: (roundNumber: number) => void;
}

export function SKScoreBoard({ game, onEditRound }: SKScoreBoardProps) {
  const getLeaderId = () => {
    const maxScore = Math.max(...Object.values(game.totalScores));
    return Object.entries(game.totalScores).find(([_, score]) => score === maxScore)?.[0];
  };

  // Calculate rankings and sort players
  const getSortedPlayersWithRanks = (): Array<{ player: Player; rank: number; rankLabel: string }> => {
    // Create array with players and their scores
    const playersWithScores = game.players.map(player => ({
      player,
      score: game.totalScores[player.id] || 0
    }));

    // Sort by score (highest first)
    playersWithScores.sort((a, b) => b.score - a.score);

    // Calculate ranks (handle ties)
    const playersWithRanks = playersWithScores.map((item, index, array) => {
      let rank = index + 1;

      // Check if tied with previous player
      if (index > 0 && item.score === array[index - 1].score) {
        rank = array[index - 1].rank || rank;
      }

      // Store rank for tie detection
      (array[index] as any).rank = rank;

      // Generate rank label
      const getRankSuffix = (n: number) => {
        if (n === 1) return 'st';
        if (n === 2) return 'nd';
        if (n === 3) return 'rd';
        return 'th';
      };

      const rankLabel = `${rank}${getRankSuffix(rank)}`;

      return {
        player: item.player,
        rank,
        rankLabel
      };
    });

    return playersWithRanks;
  };

  const leaderId = getLeaderId();
  const sortedPlayers = getSortedPlayersWithRanks();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoreboard</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Round {game.rounds.length} of 10 completed
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Rd</th>
                {sortedPlayers.map(({ player, rankLabel }) => (
                  <th
                    key={player.id}
                    className="text-center py-2 px-2 font-semibold text-gray-700 dark:text-gray-300"
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{player.name}</span>
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        ({rankLabel})
                      </span>
                    </div>
                  </th>
                ))}
                {onEditRound && <th className="w-12"></th>}
              </tr>
            </thead>
            <tbody>
              {game.rounds.map((round) => (
                <tr key={round.roundNumber} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 px-2 text-gray-600 dark:text-gray-400">{round.roundNumber}</td>
                  {sortedPlayers.map(({ player }) => {
                    const bid = round.bids[player.id] || 0;
                    const tricks = round.tricks[player.id] || 0;
                    const score = round.scores[player.id] || 0;

                    return (
                      <td key={player.id} className="text-center py-2 px-2">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {bid}/{tricks}
                          </span>
                          <span
                            className={`font-medium ${
                              score > 0
                                ? 'text-green-600 dark:text-green-400'
                                : score < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}
                          >
                            {score > 0 ? '+' : ''}
                            {score}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                  {onEditRound && (
                    <td className="py-2 px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditRound(round.roundNumber)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 dark:border-gray-600 font-semibold bg-gray-50 dark:bg-gray-700/50">
                <td className="py-3 px-2 text-gray-900 dark:text-white">Total</td>
                {sortedPlayers.map(({ player }) => (
                  <td key={player.id} className="text-center py-3 px-2">
                    <div className="flex items-center justify-center gap-1">
                      {player.id === leaderId && (
                        <Trophy className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                      )}
                      <span className="text-gray-900 dark:text-white">
                        {game.totalScores[player.id] || 0}
                      </span>
                    </div>
                  </td>
                ))}
                {onEditRound && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>

        {game.rounds.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No rounds played yet. Enter bids and tricks to begin!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
