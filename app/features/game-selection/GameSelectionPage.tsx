'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, Loader2, Pencil, Play, Sparkles, Trash2 } from 'lucide-react';
import { GameDefinition, Player, GameType, GameSession, isScoreCardSession } from '@/types/game.types';
import type { ScoreCard } from '@/lib/scorecard/schema';
import { useGame } from '@/context/GameContext';
import { useCustomCards } from '@/hooks/useCustomCards';
import { getAllGames, getAllGamesWithAI, GAME_REGISTRY } from './gameRegistry';
import { GameGrid } from './components/GameGrid';
import type { GameCardAction } from './components/GameCard';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface SetupTarget {
  id: GameType;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  unit: 'player' | 'team';
  card?: ScoreCard;
}

function sessionTitle(game: GameSession): string {
  if (isScoreCardSession(game)) return game.card.name;
  const builtIn = GAME_REGISTRY[game.gameType as keyof typeof GAME_REGISTRY];
  if (builtIn) return builtIn.name;
  return ('dynamicDefinition' in game && game.dynamicDefinition?.metadata?.name) || game.gameType;
}

export function GameSelectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeGames, deleteGame, createGame, loadGame } = useGame();
  const { cards: customCards, removeCard, saveCard } = useCustomCards();
  const [setup, setSetup] = useState<SetupTarget | null>(null);
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [targetScore, setTargetScore] = useState<string>('1000000');
  const [sharedGames, setSharedGames] = useState<GameDefinition[]>([]);
  const [libraryNote, setLibraryNote] = useState<string | null>(null);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllGamesWithAI().then(({ games, warning }) => {
      if (cancelled) return;
      setSharedGames(games.filter((g) => g.source === 'ai-generated'));
      setLibraryNote(warning ?? null);
      setIsLoadingGames(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const customDefs: GameDefinition[] = useMemo(
    () =>
      customCards.map((c) => ({
        id: c.slug,
        name: c.card.name,
        description: c.card.description,
        minPlayers: c.card.minPlayers,
        maxPlayers: c.card.maxPlayers,
        source: 'custom' as const,
        rules: { overview: c.card.rules.overview, setup: [], gameplay: [], scoring: c.card.rules.scoring, winning: c.card.rules.winning },
      })),
    [customCards]
  );

  const openSetup = (target: SetupTarget) => {
    setSetup(target);
    const n = Math.max(2, Math.min(target.minPlayers, target.maxPlayers));
    setPlayerNames(Array.from({ length: Math.max(1, n) }, () => ''));
    setTargetScore('1000000');
  };

  // /?play=<custom slug> opens the setup dialog straight after saving a new card.
  const playParam = searchParams.get('play');
  const [handledPlay, setHandledPlay] = useState<string | null>(null);
  if (playParam && playParam !== handledPlay) {
    const entry = customCards.find((c) => c.slug === playParam);
    setHandledPlay(playParam);
    if (entry) {
      openSetup({
        id: entry.slug,
        name: entry.card.name,
        minPlayers: entry.card.minPlayers,
        maxPlayers: entry.card.maxPlayers,
        unit: entry.card.playerLabel,
        card: entry.card,
      });
    }
  }

  const fetchSharedCard = async (slug: string): Promise<{ card: ScoreCard | null; legacy: boolean }> => {
    const response = await fetch(`/api/games/${encodeURIComponent(slug)}/definition`);
    if (!response.ok) throw new Error('Failed to load game');
    const data = await response.json();
    return { card: data.card ?? null, legacy: Boolean(data.legacy) };
  };

  const handleGameSelect = async (game: GameDefinition) => {
    if (game.source === 'custom') {
      const entry = customCards.find((c) => c.slug === game.id);
      if (entry) {
        openSetup({ id: entry.slug, name: entry.card.name, minPlayers: entry.card.minPlayers, maxPlayers: entry.card.maxPlayers, unit: entry.card.playerLabel, card: entry.card });
      }
      return;
    }

    if (game.source === 'ai-generated') {
      if (game.legacy) {
        router.push(`/game/${encodeURIComponent(game.id)}/legacy`);
        return;
      }
      setBusy(game.id);
      try {
        const { card, legacy } = await fetchSharedCard(game.id);
        if (card) {
          openSetup({ id: game.id, name: card.name, minPlayers: card.minPlayers, maxPlayers: card.maxPlayers, unit: card.playerLabel, card });
        } else if (legacy) {
          router.push(`/game/${encodeURIComponent(game.id)}/legacy`);
        }
      } catch (error) {
        console.error('Error loading shared game:', error);
        alert('Could not load that game. Please try again.');
      } finally {
        setBusy(null);
      }
      return;
    }

    openSetup({ id: game.id, name: game.name, minPlayers: game.minPlayers, maxPlayers: game.maxPlayers, unit: 'player' });
  };

  const copySharedToMine = async (game: GameDefinition) => {
    setBusy(game.id);
    try {
      const { card } = await fetchSharedCard(game.id);
      if (!card) throw new Error('This shared game has no editable score card.');
      const entry = saveCard(card);
      router.push(`/create?edit=${encodeURIComponent(entry.slug)}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not copy that game.');
    } finally {
      setBusy(null);
    }
  };

  const actionsFor = (game: GameDefinition): GameCardAction[] => {
    if (game.source === 'custom') {
      return [
        { label: 'Edit', icon: Pencil, onClick: () => router.push(`/create?edit=${encodeURIComponent(game.id)}`) },
        {
          label: 'Delete',
          icon: Trash2,
          danger: true,
          onClick: () => {
            if (confirm(`Delete your "${game.name}" score card? Games in progress keep their copy.`)) removeCard(game.id);
          },
        },
      ];
    }
    if (game.source === 'ai-generated' && !game.legacy) {
      return [{ label: 'Copy to my cards and edit', icon: Copy, onClick: () => copySharedToMine(game) }];
    }
    return [];
  };

  const unitWord = setup?.unit === 'team' ? 'Team' : 'Player';
  const filledNames = playerNames.map((n) => n.trim()).filter(Boolean);
  const isPlayerSetupValid = setup && filledNames.length >= setup.minPlayers && filledNames.length <= setup.maxPlayers;

  const handleStartGame = () => {
    if (!setup || !isPlayerSetupValid) return;

    if (setup.id === 'cover-your-assets') {
      const scoreValue = parseInt(targetScore, 10);
      if (isNaN(scoreValue) || scoreValue <= 0) {
        alert('Please enter a valid target score greater than 0');
        return;
      }
    }

    const stamp = Date.now();
    const players: Player[] = filledNames.map((name, index) => ({ id: `player-${index}-${stamp}`, name }));
    const options = setup.card
      ? { card: setup.card }
      : setup.id === 'cover-your-assets'
        ? { targetScore: parseInt(targetScore, 10) }
        : undefined;

    const gameId = createGame(setup.id, players, options);
    setSetup(null);
    router.push(`/game/${encodeURIComponent(setup.id)}/${gameId}`);
  };

  const handleContinueGame = (gameId: string, gameType: GameType) => {
    loadGame(gameId);
    router.push(`/game/${encodeURIComponent(gameType)}/${gameId}`);
  };

  const handleDeleteGame = (gameId: string) => {
    if (confirm('Are you sure you want to delete this game?')) {
      deleteGame(gameId);
    }
  };

  const builtIn = getAllGames().map((g) => ({ ...g, source: 'hardcoded' as const }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Choose Your Game</h1>
        <p className="text-gray-600 dark:text-gray-300">Pick a game to start keeping score, or continue a game below.</p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Playing something else?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Describe the scoring or upload a rule book, and AI builds a score card that adds it all up.
            </p>
          </div>
          <Button onClick={() => router.push('/create')} size="lg" className="whitespace-nowrap">
            <Sparkles className="w-4 h-4 mr-2" />
            Create a score card
          </Button>
        </div>
      </div>

      {activeGames.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Active Games</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGames.map((game) => (
              <Card key={game.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{sessionTitle(game)}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(game.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteGame(game.id)}
                      aria-label={`Delete ${sessionTitle(game)} game`}
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
                    <Button onClick={() => handleContinueGame(game.id, game.gameType)} className="w-full mt-4" size="sm">
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

      {customDefs.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">My Score Cards</h2>
          <GameGrid games={customDefs} onGameSelect={handleGameSelect} actionsFor={actionsFor} />
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Game Library</h2>
        <GameGrid games={[...builtIn, ...sharedGames]} onGameSelect={handleGameSelect} actionsFor={actionsFor} />
        {isLoadingGames && (
          <p className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading shared games…
          </p>
        )}
        {libraryNote && !isLoadingGames && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{libraryNote}</p>}
        {busy && (
          <p className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading game…
          </p>
        )}
      </div>

      <Modal isOpen={Boolean(setup)} onClose={() => setSetup(null)} title={`Setup: ${setup?.name ?? ''}`} size="md">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleStartGame();
          }}
        >
          <p className="text-gray-600 dark:text-gray-300">
            Enter {unitWord.toLowerCase()} names (
            {setup?.minPlayers === setup?.maxPlayers ? setup?.minPlayers : `${setup?.minPlayers}-${setup?.maxPlayers}`}{' '}
            {unitWord.toLowerCase()}s)
          </p>

          <div className="space-y-3">
            {playerNames.map((name, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  id={`player-name-${index}`}
                  aria-label={`${unitWord} ${index + 1} name`}
                  placeholder={`${unitWord} ${index + 1} name`}
                  value={name}
                  autoFocus={index === 0}
                  onChange={(e) => setPlayerNames(playerNames.map((n, i) => (i === index ? e.target.value : n)))}
                />
                {playerNames.length > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    aria-label={`Remove ${unitWord.toLowerCase()} ${index + 1}`}
                    onClick={() => setPlayerNames(playerNames.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {setup && playerNames.length < setup.maxPlayers && (
            <Button type="button" variant="secondary" onClick={() => setPlayerNames([...playerNames, ''])} className="w-full">
              Add {unitWord}
            </Button>
          )}

          {setup?.id === 'cover-your-assets' && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Input
                id="cya-target"
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
            <Button type="button" variant="secondary" onClick={() => setSetup(null)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={!isPlayerSetupValid} className="flex-1">
              Start Game
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
