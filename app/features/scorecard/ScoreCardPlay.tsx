'use client';

import type { ScoreCard } from '@/lib/scorecard/schema';
import type { PlayerRef, PlayerValues, RoundEntry } from '@/lib/scorecard/engine';
import { RoundsCard } from './RoundsCard';
import { CategoriesCard } from './CategoriesCard';

export interface ScoreCardState {
  rounds: RoundEntry[];
  sheet: PlayerValues;
  draft: PlayerValues | null;
}

interface ScoreCardPlayProps {
  card: ScoreCard;
  players: PlayerRef[];
  state: ScoreCardState;
  onChange: (patch: Partial<ScoreCardState>) => void;
  onFinish?: () => void;
}

/** Renders a playable score card for either layout. */
export function ScoreCardPlay({ card, players, state, onChange, onFinish }: ScoreCardPlayProps) {
  if (card.layout === 'categories') {
    return <CategoriesCard card={card} players={players} sheet={state.sheet} onChange={onChange} onFinish={onFinish} />;
  }
  return (
    <RoundsCard
      card={card}
      players={players}
      rounds={state.rounds}
      draft={state.draft}
      onChange={onChange}
      onFinish={onFinish}
    />
  );
}
