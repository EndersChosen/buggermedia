'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DynamicGame } from '@/features/dynamic-game/DynamicGame';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import type { DynamicGameDefinition } from '@/lib/types/dynamic-game.types';

interface GameData {
  metadata: {
    id: string;
    name: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
  };
  definition: DynamicGameDefinition;
  rules: any;
}

export default function DynamicGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameSlug = params?.gameSlug as string;
  const gameId = params?.gameId as string;

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    <DynamicGame
      gameId={gameId}
      gameSlug={gameSlug}
      gameName={gameData.metadata.name}
      definition={gameData.definition}
    />
  );
}
