'use client';

import { GameDefinition } from '@/types/game.types';
import { GameCard, type GameCardAction } from './GameCard';

interface GameGridProps {
  games: GameDefinition[];
  onGameSelect: (game: GameDefinition) => void;
  actionsFor?: (game: GameDefinition) => GameCardAction[];
}

export function GameGrid({ games, onGameSelect, actionsFor }: GameGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {games.map((game) => (
        <GameCard
          key={`${game.source}-${game.id}`}
          game={game}
          onClick={() => onGameSelect(game)}
          actions={actionsFor?.(game)}
        />
      ))}
    </div>
  );
}
