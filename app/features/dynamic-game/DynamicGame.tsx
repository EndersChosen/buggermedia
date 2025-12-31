'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DynamicGameDefinition } from '@/lib/types/dynamic-game.types';
import { useDynamicGame } from './hooks/useDynamicGame';
import { DynamicScoreInput } from './components/DynamicScoreInput';
import { DynamicScoreBoard } from './components/DynamicScoreBoard';
import { DynamicRoundTracker } from './components/DynamicRoundTracker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Plus, X, Play, RotateCcw, Trash2 } from 'lucide-react';

interface DynamicGameProps {
  gameId: string;
  gameSlug: string;
  gameName: string;
  definition: DynamicGameDefinition;
}

export function DynamicGame({ gameId, gameSlug, gameName, definition }: DynamicGameProps) {
  const router = useRouter();
  const {
    game,
    isAddingRound,
    setIsAddingRound,
    addPlayer,
    removePlayer,
    startGame,
    submitRound,
    resetGame,
    deleteGame,
  } = useDynamicGame(gameId, gameSlug, definition);

  const [newPlayerName, setNewPlayerName] = useState('');

  if (!game) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };

  const handleDeleteGame = () => {
    if (confirm('Are you sure you want to delete this game? This cannot be undone.')) {
      deleteGame();
      router.push('/');
    }
  };

  // Setup Phase
  if (game.status === 'setup') {
    const minPlayers = definition.metadata.minPlayers ?? 2;
    const maxPlayers = definition.metadata.maxPlayers ?? 10;
    const canStart = game.players.length >= minPlayers && game.players.length <= maxPlayers;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{gameName}</h1>
          <p className="text-gray-600 dark:text-gray-400">{definition.metadata.description}</p>
        </div>

        {/* Player Setup */}
        <Card>
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Setup Players</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add {minPlayers}-{maxPlayers} players to start the game
            </p>

            {/* Add Player Form */}
            <div className="flex gap-2">
              <Input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
                placeholder="Enter player name"
                disabled={game.players.length >= maxPlayers}
              />
              <Button
                onClick={handleAddPlayer}
                disabled={!newPlayerName.trim() || game.players.length >= maxPlayers}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Player List */}
            {game.players.length > 0 && (
              <div className="space-y-2">
                {game.players.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">
                      {index + 1}. {player.name}
                    </span>
                    <button
                      onClick={() => removePlayer(player.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Start Game Button */}
            <div className="pt-4">
              <Button
                onClick={startGame}
                disabled={!canStart}
                size="lg"
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Game
              </Button>
              {!canStart && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  {game.players.length < minPlayers
                    ? `Add at least ${minPlayers - game.players.length} more player(s)`
                    : `Maximum ${maxPlayers} players allowed`}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // In-Progress or Completed Phase
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/')}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{gameName}</h1>
        </div>
        <div className="flex gap-2">
          {game.status === 'completed' && (
            <Button variant="secondary" onClick={resetGame}>
              <RotateCcw className="w-4 h-4 mr-2" />
              New Game
            </Button>
          )}
          <Button variant="secondary" onClick={handleDeleteGame}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Round Tracker */}
      <DynamicRoundTracker
        definition={definition}
        currentRound={game.currentRound}
        completedRounds={game.rounds.length}
      />

      {/* Scoreboard */}
      <DynamicScoreBoard
        definition={definition}
        players={game.players}
        rounds={game.rounds}
        totalScores={game.totalScores}
        winner={game.winner}
      />

      {/* Score Input (only if game is in progress and not adding a round) */}
      {game.status === 'in-progress' && !isAddingRound && (
        <div className="flex justify-center">
          <Button onClick={() => setIsAddingRound(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Round {game.currentRound}
          </Button>
        </div>
      )}

      {/* Score Input Form */}
      {game.status === 'in-progress' && isAddingRound && (
        <Card>
          <div className="p-6">
            <DynamicScoreInput
              definition={definition}
              players={game.players}
              currentRound={game.currentRound}
              totalScores={game.totalScores}
              onSubmit={submitRound}
              onCancel={() => setIsAddingRound(false)}
            />
          </div>
        </Card>
      )}

      {/* Game Completed Message */}
      {game.status === 'completed' && (
        <Card>
          <div className="p-6 text-center bg-green-50 dark:bg-green-900/20">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Game Complete!
            </h2>
            {game.winner && (
              <p className="text-lg text-gray-700 dark:text-gray-300">
                {game.players.find((p) => p.id === game.winner?.playerId)?.name} wins!
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
