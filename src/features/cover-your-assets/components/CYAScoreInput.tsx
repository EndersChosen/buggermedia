import { useState, useMemo } from 'react';
import { CYAGameSession } from '@/@types/game.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';
import { CYAPlayerCardInput } from './CYAPlayerCardInput';
import { ASSET_CARDS, WILD_CARDS, ADVANCED_WILD_CARDS } from '../cyaCardTypes';

interface CYAScoreInputProps {
  game: CYAGameSession;
  onAddRound: (scores: Record<string, number>, cardCollections?: Record<string, Record<string, number>>) => void;
}

export function CYAScoreInput({ game, onAddRound }: CYAScoreInputProps) {
  const [cardCollections, setCardCollections] = useState<Record<string, Record<string, number>>>(
    Object.fromEntries(game.players.map((p) => [p.id, {}]))
  );

  const handleCardCountsChange = (playerId: string, cardCounts: Record<string, number>) => {
    setCardCollections({
      ...cardCollections,
      [playerId]: cardCounts,
    });
  };

  const calculateScore = (cardCounts: Record<string, number>): number => {
    return Object.entries(cardCounts).reduce((sum, [cardName, count]) => {
      const card = [...ASSET_CARDS, ...WILD_CARDS, ...ADVANCED_WILD_CARDS].find(
        c => c.name === cardName
      );
      return sum + (card ? card.value * count : 0);
    }, 0);
  };

  const scores = useMemo(() => {
    const result: Record<string, number> = {};
    game.players.forEach((player) => {
      result[player.id] = calculateScore(cardCollections[player.id] || {});
    });
    return result;
  }, [cardCollections, game.players]);

  const handleSubmit = () => {
    const hasAnyCards = game.players.some((player) => {
      const cards = cardCollections[player.id];
      return cards && Object.keys(cards).length > 0;
    });

    if (!hasAnyCards) {
      alert('Please enter cards for at least one player');
      return;
    }

    onAddRound(scores, cardCollections);

    // Reset card collections
    setCardCollections(Object.fromEntries(game.players.map((p) => [p.id, {}])));
  };

  const isFormValid = game.players.some((player) => {
    const cards = cardCollections[player.id];
    return cards && Object.keys(cards).length > 0;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Round Scores</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Round {game.rounds.length + 1} • Enter cards collected by each player
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {game.players.map((player) => (
            <CYAPlayerCardInput
              key={player.id}
              playerName={player.name}
              cardCounts={cardCollections[player.id] || {}}
              onCardCountsChange={(cardCounts) => handleCardCountsChange(player.id, cardCounts)}
            />
          ))}

          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="w-full mt-4"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add Round
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
