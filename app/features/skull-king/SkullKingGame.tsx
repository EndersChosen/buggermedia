'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSKGame } from './useSKGame';
import { useGame } from '@/context/GameContext';
import { SKScoreBoard } from './components/SKScoreBoard';
import { SKScoreInput } from './components/SKScoreInput';
import { SKRoundTracker } from './components/SKRoundTracker';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EnhancedRulesModal } from '@/features/rules/components/EnhancedRulesModal';
import { skRules } from './skRules';
import { ArrowLeft, Trophy, Home, BookOpen, Skull } from 'lucide-react';
import { SKRound, SKBonusDetails } from '@/types/game.types';

export function SkullKingGame() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { loadGame } = useGame();
  const { game, addRound, updateRound, isGameComplete, getWinner, endGame } = useSKGame(gameId!);
  const [showRules, setShowRules] = useState(false);
  const [editingRound, setEditingRound] = useState<SKRound | null>(null);

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
      router.push('/');
    }
  };

  const handleBackHome = () => {
    router.push('/');
  };

  const handleEditRound = (roundNumber: number) => {
    if (!game) return;
    const round = game.rounds.find((r) => r.roundNumber === roundNumber);
    if (round) {
      setEditingRound(round);
    }
  };

  const handleUpdateRound = (
    roundNumber: number,
    bids: Record<string, number>,
    tricks: Record<string, number>,
    bonuses: Record<string, number>,
    bonusDetails: Record<string, SKBonusDetails>
  ) => {
    updateRound(roundNumber, bids, tricks, bonuses, bonusDetails);
    setEditingRound(null);
  };

  const handleCancelEdit = () => {
    setEditingRound(null);
  };

  return (
    <div className="space-y-6 sk-theme">
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

      <div className="sk-header">
        <div className="flex items-center gap-4">
          <Skull className="w-12 h-12 text-current" />
          <div>
            <h1 className="text-4xl font-bold sk-title">Skull King</h1>
            <p className="text-amber-100 mt-1">
              {game.players.length} players • 10 rounds
            </p>
          </div>
        </div>
      </div>

      {gameComplete && winner && (
        <div className="sk-winner-banner p-6 rounded-lg">
          <div className="flex items-center gap-4 mb-4">
            <Trophy className="w-12 h-12 text-red-900" />
            <div>
              <h2 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
                Game Complete!
              </h2>
              <p className="text-xl text-gray-800 mt-1">
                🏴‍☠️ {winner.player.name} wins with {winner.score} points!
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleBackHome} variant="primary" className="sk-button-primary">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            <Button onClick={handleEndGame} variant="secondary">
              End & Save Game
            </Button>
          </div>
        </div>
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
          <SKScoreBoard game={game} onEditRound={handleEditRound} />
        </div>
        <div>
          {!gameComplete && (
            <SKScoreInput
              game={game}
              onAddRound={addRound}
              editingRound={editingRound}
              onUpdateRound={handleUpdateRound}
              onCancelEdit={handleCancelEdit}
            />
          )}
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

      <EnhancedRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        gameName="Skull King"
        rules={skRules}
      />
    </div>
  );
}
