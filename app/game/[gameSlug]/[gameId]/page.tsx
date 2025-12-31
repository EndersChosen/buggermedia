'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';

interface GameMetadata {
  id: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  source: string;
}

interface GameDefinition {
  metadata: GameMetadata;
  definition: any;
  rules: any;
}

export default function DynamicGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameSlug = params?.gameSlug as string;
  const gameId = params?.gameId as string;

  const [gameData, setGameData] = useState<GameDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If gameId is "new", we're trying to create a new game session
    // For now, just show the game definition
    if (!gameSlug) return;

    async function loadGame() {
      try {
        const response = await fetch(`/api/games/${gameSlug}/definition`);
        if (!response.ok) {
          throw new Error('Failed to load game');
        }
        const data = await response.json();
        setGameData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    }

    loadGame();
  }, [gameSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !gameData) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Error Loading Game
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {error || 'Game not found'}
          </p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {gameData.metadata.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {gameData.metadata.description}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {gameData.metadata.minPlayers}-{gameData.metadata.maxPlayers} players •{' '}
          AI Generated
        </p>
      </div>

      {/* Success Message */}
      <Card>
        <CardHeader>
          <CardTitle className="text-green-600 dark:text-green-400">
            ✓ Game Successfully Generated!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Your game has been successfully generated from the PDF rulebook and saved to the
            database. It's now available for everyone to play!
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Coming Soon:</strong> The interactive score tracking interface
              is being built in Phase 4-5. For now, you can view the generated game
              definition and rules below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Game Rules */}
      {gameData.rules && (
        <Card>
          <CardHeader>
            <CardTitle>Game Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Overview
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {gameData.rules.overview}
              </p>
            </div>

            {gameData.rules.setup && gameData.rules.setup.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Setup
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-300">
                  {gameData.rules.setup.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {gameData.rules.gameplay && gameData.rules.gameplay.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Gameplay
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-300">
                  {gameData.rules.gameplay.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {gameData.rules.scoring && gameData.rules.scoring.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Scoring
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                  {gameData.rules.scoring.map((rule: string, idx: number) => (
                    <li key={idx}>{rule}</li>
                  ))}
                </ul>
              </div>
            )}

            {gameData.rules.winning && (
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Winning
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {gameData.rules.winning}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Game Definition (for debugging) */}
      {gameData.definition && (
        <Card>
          <CardHeader>
            <CardTitle>Game Definition (Technical)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto text-sm">
              {JSON.stringify(gameData.definition, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
