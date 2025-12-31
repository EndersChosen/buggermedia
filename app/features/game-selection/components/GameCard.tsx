'use client';

import { GameDefinition } from '@/types/game.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Users, Edit } from 'lucide-react';

interface GameCardProps {
  game: GameDefinition;
  onClick: () => void;
  onEdit?: () => void;
}

export function GameCard({ game, onClick, onEdit }: GameCardProps) {
  const isAIGenerated = (game as any).source === 'ai-generated';
  const showEditButton = isAIGenerated && onEdit;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };

  return (
    <Card hover onClick={onClick} className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex-1">{game.name}</CardTitle>
          {showEditButton && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEditClick}
              className="flex-shrink-0"
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </div>
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
