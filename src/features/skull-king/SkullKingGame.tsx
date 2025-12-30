import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSKGame } from './useSKGame';
import { useGame } from '@/context/GameContext';
import { SKScoreBoard } from './components/SKScoreBoard';
import { SKScoreInput } from './components/SKScoreInput';
import { SKRoundTracker } from './components/SKRoundTracker';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { RulesModal } from '@/features/rules/components/RulesModal';
import { skRules } from './skRules';
import { ArrowLeft, Trophy, Home, BookOpen } from 'lucide-react';

export function SkullKingGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { loadGame } = useGame();
  const { game, addRound, isGameComplete, getWinner, endGame } = useSKGame(gameId!);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (gameId) {
      loadGame(gameId);
    }
  }, [gameId, loadGame]);

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">Loading game...</p>
        </div>
      </div>
    );
  }

  const gameComplete = isGameComplete();
  const winner = gameComplete ? getWinner() : null;

  const handleEndGame = () => {
    if (confirm('Are you sure you want to end this game?')) {
      endGame();
      navigate('/');
    }
  };

  const handleBackHome = () => {
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBackHome} size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Games
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowRules(true)} size="sm">
            <BookOpen className="w-4 h-4 mr-2" />
            View Rules
          </Button>
          <Button variant="danger" onClick={handleEndGame} size="sm">
            End Game
          </Button>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Skull King</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          {game.players.length} players • 10 rounds
        </p>
      </div>

      {gameComplete && winner && (
        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-300 dark:border-yellow-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              <div>
                <CardTitle className="text-yellow-900 dark:text-yellow-200">Game Complete!</CardTitle>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                  {winner.player.name} wins with {winner.score} points!
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button onClick={handleBackHome} variant="primary">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <Button onClick={handleEndGame} variant="secondary">
                End & Save Game
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Round Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <SKRoundTracker
            currentRound={game.currentRound}
            completedRounds={game.rounds.length}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SKScoreBoard game={game} />
        </div>
        <div>
          {!gameComplete && <SKScoreInput game={game} onAddRound={addRound} />}
          {gameComplete && (
            <Card>
              <CardHeader>
                <CardTitle>All Rounds Complete!</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  All 10 rounds have been played. Check the final scores above!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <RulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        gameName="Skull King"
        rules={skRules}
      />
    </div>
  );
}
