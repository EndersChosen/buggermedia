import { SpadesHand } from '../spadesTypes';
import { Input } from '@/components/ui/Input';

interface SpadesScoreInputProps {
  hand: SpadesHand;
  onUpdate: (team: 'A' | 'B', field: 'bid' | 'tricks', value: number) => void;
}

export function SpadesScoreInput({ hand, onUpdate }: SpadesScoreInputProps) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Team A */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Team A - Hand {hand.handNumber}</h3>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Bid (0 for Nil)
          </label>
          <Input
            type="number"
            min="0"
            max="13"
            value={hand.teamA.bid}
            onChange={(e) => onUpdate('A', 'bid', Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tricks Taken
          </label>
          <Input
            type="number"
            min="0"
            max="13"
            value={hand.teamA.tricks}
            onChange={(e) => onUpdate('A', 'tricks', Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
          <p className="text-sm font-medium">Hand Score: {hand.teamA.score}</p>
        </div>
      </div>

      {/* Team B */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Team B - Hand {hand.handNumber}</h3>
        
        <div>
          <label className="block text-sm font-medium mb-1">
            Bid (0 for Nil)
          </label>
          <Input
            type="number"
            min="0"
            max="13"
            value={hand.teamB.bid}
            onChange={(e) => onUpdate('B', 'bid', Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Tricks Taken
          </label>
          <Input
            type="number"
            min="0"
            max="13"
            value={hand.teamB.tricks}
            onChange={(e) => onUpdate('B', 'tricks', Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
          <p className="text-sm font-medium">Hand Score: {hand.teamB.score}</p>
        </div>
      </div>
    </div>
  );
}
