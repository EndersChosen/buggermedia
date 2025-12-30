import { useState } from 'react';
import { CYAGameSession } from '@/@types/game.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PlusCircle } from 'lucide-react';

interface CYAScoreInputProps {
  game: CYAGameSession;
  onAddRound: (scores: Record<string, number>) => void;
}

export function CYAScoreInput({ game, onAddRound }: CYAScoreInputProps) {
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(game.players.map((p) => [p.id, '']))
  );

  const handleScoreChange = (playerId: string, value: string) => {
    // Allow only numbers and empty string
    if (value === '' || /^\d+$/.test(value)) {
      setScores({ ...scores, [playerId]: value });
    }
  };

  const handleSubmit = () => {
    const numericScores: Record<string, number> = {};
    let isValid = true;

    game.players.forEach((player) => {
      const value = scores[player.id];
      if (value === '') {
        isValid = false;
        return;
      }
      numericScores[player.id] = parseInt(value, 10);
    });

    if (!isValid) {
      alert('Please enter scores for all players');
      return;
    }

    onAddRound(numericScores);

    // Reset scores
    setScores(Object.fromEntries(game.players.map((p) => [p.id, ''])));
  };

  const isFormValid = game.players.every((player) => scores[player.id] !== '');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Round Scores</CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Round {game.rounds.length + 1}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {game.players.map((player) => (
            <Input
              key={player.id}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              label={player.name}
              placeholder="Enter score"
              value={scores[player.id]}
              onChange={(e) => handleScoreChange(player.id, e.target.value)}
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
