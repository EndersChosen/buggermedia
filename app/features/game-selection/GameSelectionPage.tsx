'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GameDefinition, Player, GameType } from '@/types/game.types';
import { useGame } from '@/context/GameContext';
import { getAllGames, getAllGamesWithAI } from './gameRegistry';
import { GameGrid } from './components/GameGrid';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Trash2, Play, Upload } from 'lucide-react';

export function GameSelectionPage() {
  const router = useRouter();
  const { activeGames, deleteGame, createGame, loadGame } = useGame();
  const [selectedGame, setSelectedGame] = useState<GameDefinition | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [targetScore, setTargetScore] = useState<string>('1000000');
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [games, setGames] = useState<GameDefinition[]>(getAllGames());
  const [isLoadingGames, setIsLoadingGames] = useState(true);

  // Fetch all games including AI-generated ones
  useEffect(() => {
    async function fetchGames() {
      setIsLoadingGames(true);
      const allGames = await getAllGamesWithAI();
      setGames(allGames);
      setIsLoadingGames(false);
    }
    fetchGames();
  }, []);

  const handleGameSelect = async (game: GameDefinition) => {
    // AI-generated games: Skip modal, go directly to game page with its own setup
    if ((game as any).source === 'ai-generated') {
      try {
        // Fetch the game definition
        const response = await fetch(`/api/games/${game.id}/definition`);
        if (!response.ok) {
          alert('Failed to load game definition. Please try again.');
          return;
        }
        const data = await response.json();

        // Create game with no players (setup phase)
        const gameId = createGame(game.id, [], { dynamicDefinition: data.definition });

        // Navigate to game page where player setup will happen
        router.push(`/game/${game.id}/${gameId}`);
      } catch (error) {
        console.error('Error loading AI game:', error);
        alert('Failed to load game. Please try again.');
      }
      return;
    }

    // Hardcoded games: Show modal for player setup
    setSelectedGame(game);
    setPlayerNames(['', '']);
    setTargetScore('1000000');
    setShowPlayerSetup(true);
  };

  const handleAddPlayer = () => {
    if (selectedGame && playerNames.length < selectedGame.maxPlayers) {
      setPlayerNames([...playerNames, '']);
    }
  };

  const handleRemovePlayer = (index: number) => {
    if (playerNames.length > 2) {
      setPlayerNames(playerNames.filter((_, i) => i !== index));
    }
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const handleStartGame = async () => {
    if (!selectedGame) return;

    const filledNames = playerNames.filter((name) => name.trim() !== '');

    if (filledNames.length < selectedGame.minPlayers) {
      alert(`This game requires at least ${selectedGame.minPlayers} players`);
      return;
    }

    // Validate target score for Cover Your Assets
    if (selectedGame.id === 'cover-your-assets') {
      const scoreValue = parseInt(targetScore, 10);
      if (isNaN(scoreValue) || scoreValue <= 0) {
        alert('Please enter a valid target score greater than 0');
        return;
      }
    }

    const players: Player[] = filledNames.map((name, index) => ({
      id: `player-${index}-${Date.now()}`,
      name: name.trim(),
    }));

    let options: any = undefined;

    // For Cover Your Assets, pass target score
    if (selectedGame.id === 'cover-your-assets') {
      options = { targetScore: parseInt(targetScore, 10) };
    }
    // For AI-generated games, fetch the full definition
    else if ((selectedGame as any).source === 'ai-generated') {
      try {
        const response = await fetch(`/api/games/${selectedGame.id}/definition`);
        if (!response.ok) {
          alert('Failed to load game definition. Please try again.');
          return;
        }
        const data = await response.json();
        options = { dynamicDefinition: data.definition };
      } catch (error) {
        console.error('Error fetching game definition:', error);
        alert('Failed to load game definition. Please try again.');
        return;
      }
    }

    const gameId = createGame(selectedGame.id, players, options);
    setShowPlayerSetup(false);
    router.push(`/game/${selectedGame.id}/${gameId}`);
  };

  const handleContinueGame = (gameId: string, gameType: GameType) => {
    loadGame(gameId);
    router.push(`/game/${gameType}/${gameId}`);
  };

  const handleDeleteGame = (gameId: string) => {
    if (confirm('Are you sure you want to delete this game?')) {
      deleteGame(gameId);
    }
  };

  const isPlayerSetupValid =
    selectedGame &&
    playerNames.filter((name) => name.trim() !== '').length >= selectedGame.minPlayers;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Choose Your Game</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Select a game to start tracking scores, or continue an existing game below
        </p>
      </div>

      {/* Upload New Game Button */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Have a new game?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Upload a PDF rulebook and our AI will create a playable score card
            </p>
          </div>
          <Button
            onClick={() => router.push('/upload')}
            size="lg"
            className="whitespace-nowrap"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Rulebook
          </Button>
        </div>
      </div>

      {/* Active Games */}
      {activeGames.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Active Games</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGames.map((game) => (
              <Card key={game.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {game.gameType === 'cover-your-assets'
                          ? 'Cover Your Assets'
                          : game.gameType === 'skull-king'
                          ? 'Skull King'
                          : (game as any).dynamicDefinition?.metadata?.name || game.gameType}
                      </CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(game.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {game.players.map((player) => (
                        <Badge key={player.id} variant="default">
                          {player.name}
                        </Badge>
                      ))}
                    </div>
                    <Button
                      onClick={() => handleContinueGame(game.id, game.gameType)}
                      className="w-full mt-4"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Continue Game
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Game Library */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {activeGames.length > 0 ? 'All Games' : 'Game Library'}
        </h2>
        <GameGrid games={games} onGameSelect={handleGameSelect} />
      </div>

      {/* Player Setup Modal */}
      <Modal
        isOpen={showPlayerSetup}
        onClose={() => setShowPlayerSetup(false)}
        title={`Setup: ${selectedGame?.name || 'Unknown'}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Enter player names ({selectedGame?.minPlayers}-{selectedGame?.maxPlayers}{' '}
            players)
          </p>

          <div className="space-y-3">
            {playerNames.map((name, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Player ${index + 1} name`}
                  value={name}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                />
                {playerNames.length > 2 && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemovePlayer(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {selectedGame && playerNames.length < selectedGame.maxPlayers && (
            <Button variant="secondary" onClick={handleAddPlayer} className="w-full">
              Add Player
            </Button>
          )}

          {/* Target Score for Cover Your Assets */}
          {selectedGame?.id === 'cover-your-assets' && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Input
                type="number"
                label="Target Score"
                placeholder="1000000"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
                min="1000"
                step="1000"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                First player to reach this score wins (default: $1,000,000)
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowPlayerSetup(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStartGame}
              disabled={!isPlayerSetupValid}
              className="flex-1"
            >
              Start Game
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
