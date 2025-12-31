'use client';

import { GameDefinition } from '@/types/game.types';
import { GameCard } from './GameCard';

interface GameGridProps {
  games: GameDefinition[];
  onGameSelect: (game: GameDefinition) => void;
}

export function GameGrid({ games, onGameSelect }: GameGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {games.map((game) => (
        <GameCard key={game.id} game={game} onClick={() => onGameSelect(game)} />
      ))}
    </div>
  );
}
