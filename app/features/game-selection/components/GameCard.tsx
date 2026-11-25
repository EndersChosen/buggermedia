'use client';

import type { LucideIcon } from 'lucide-react';
import { Users } from 'lucide-react';
import { GameDefinition } from '@/types/game.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export interface GameCardAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  danger?: boolean;
}

interface GameCardProps {
  game: GameDefinition;
  onClick: () => void;
  actions?: GameCardAction[];
}

const SOURCE_BADGE: Record<string, { text: string; variant: 'default' | 'success' | 'info' | 'warning' }> = {
  hardcoded: { text: 'Built-in', variant: 'default' },
  custom: { text: 'My card', variant: 'success' },
  'ai-generated': { text: 'Shared', variant: 'info' },
};

export function GameCard({ game, onClick, actions = [] }: GameCardProps) {
  const badge = game.legacy ? { text: 'Old format', variant: 'warning' as const } : SOURCE_BADGE[game.source ?? 'hardcoded'];

  return (
    <Card hover onClick={onClick} className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex-1 min-w-0 break-words">{game.name}</CardTitle>
          {actions.length > 0 && (
            <div className="flex gap-1 shrink-0">
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  title={a.label}
                  aria-label={`${a.label}: ${game.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    a.onClick();
                  }}
                  className={`p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    a.danger ? 'hover:text-red-600' : 'hover:text-blue-600'
                  }`}
                >
                  <a.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}-${game.maxPlayers}`} players
          </span>
          {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{game.description}</p>
      </CardContent>
    </Card>
  );
}
