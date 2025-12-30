import { GameDefinition } from '@/@types/game.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Users } from 'lucide-react';

interface GameCardProps {
  game: GameDefinition;
  onClick: () => void;
}

export function GameCard({ game, onClick }: GameCardProps) {
  return (
    <Card hover onClick={onClick} className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{game.name}</CardTitle>
        <div className="flex items-center gap-2 mt-2">
          <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {game.minPlayers}-{game.maxPlayers} players
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{game.description}</p>
      </CardContent>
      <div className="p-6 pt-0">
        <Badge variant="info">Click to start new game</Badge>
      </div>
    </Card>
  );
}
