import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameDefinition, Player, GameType } from '@/@types/game.types';
import { useGame } from '@/context/GameContext';
import { getAllGames } from './gameRegistry';
import { GameGrid } from './components/GameGrid';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Trash2, Play } from 'lucide-react';

export function GameSelectionPage() {
  const navigate = useNavigate();
  const { activeGames, deleteGame, createGame, loadGame } = useGame();
  const [selectedGame, setSelectedGame] = useState<GameDefinition | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);

  const games = getAllGames();

  const handleGameSelect = (game: GameDefinition) => {
    setSelectedGame(game);
    setPlayerNames(['', '']);
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

  const handleStartGame = () => {
    if (!selectedGame) return;

    const filledNames = playerNames.filter((name) => name.trim() !== '');

    if (filledNames.length < selectedGame.minPlayers) {
      alert(`This game requires at least ${selectedGame.minPlayers} players`);
      return;
    }

    const players: Player[] = filledNames.map((name, index) => ({
      id: `player-${index}-${Date.now()}`,
      name: name.trim(),
    }));

    const gameId = createGame(selectedGame.id, players);
    setShowPlayerSetup(false);
    navigate(`/game/${selectedGame.id}/${gameId}`);
  };

  const handleContinueGame = (gameId: string, gameType: GameType) => {
    loadGame(gameId);
    navigate(`/game/${gameType}/${gameId}`);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your Game</h1>
        <p className="text-gray-600">
          Select a game to start tracking scores, or continue an existing game below
        </p>
      </div>

      <GameGrid games={games} onGameSelect={handleGameSelect} />

      {activeGames.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Games</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGames.map((game) => (
              <Card key={game.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {game.gameType === 'cover-your-assets'
                          ? 'Cover Your Assets'
                          : 'Skull King'}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(game.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
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

      {/* Player Setup Modal */}
      <Modal
        isOpen={showPlayerSetup}
        onClose={() => setShowPlayerSetup(false)}
        title={`Setup: ${selectedGame?.name}`}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
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
