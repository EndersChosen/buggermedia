import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCYAGame } from './useCYAGame';
import { useGame } from '@/context/GameContext';
import { CYAScoreBoard } from './components/CYAScoreBoard';
import { CYAScoreInput } from './components/CYAScoreInput';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EnhancedRulesModal } from '@/features/rules/components/EnhancedRulesModal';
import { cyaRules } from './cyaRules';
import { ArrowLeft, Trophy, Home, BookOpen } from 'lucide-react';

export function CoverYourAssetsGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { loadGame } = useGame();
  const { game, addRound, checkWinCondition, getWinner, endGame } = useCYAGame(gameId!);
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

  const winner = checkWinCondition() ? getWinner() : null;

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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Cover Your Assets</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          {game.players.length} players • Target: $
          {game.targetScore.toLocaleString()}
        </p>
      </div>

      {winner && (
        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-300 dark:border-yellow-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              <div>
                <CardTitle className="text-yellow-900 dark:text-yellow-200">We Have a Winner!</CardTitle>
                <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
                  {winner.player.name} wins with ${winner.score.toLocaleString()}!
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CYAScoreBoard game={game} />
        </div>
        <div>
          {!winner && <CYAScoreInput game={game} onAddRound={addRound} />}
        </div>
      </div>

      <EnhancedRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        gameName="Cover Your Assets"
        rules={cyaRules}
      />
    </div>
  );
}
