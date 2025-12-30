import { useState, useEffect } from 'react';

interface BonusState {
  yellow14: boolean;
  purple14: boolean;
  green14: boolean;
  black14: boolean;
  mermaidsCapturedByPirates: number;
  piratesCapturedBySkullKing: number;
  skullKingCapturedByMermaid: boolean;
}

interface SKPlayerBonusInputProps {
  playerName: string;
  bid: string;
  tricks: string;
  onBonusChange: (totalBonus: number) => void;
}

export function SKPlayerBonusInput({
  playerName,
  bid,
  tricks,
  onBonusChange,
}: SKPlayerBonusInputProps) {
  const [bonuses, setBonuses] = useState<BonusState>({
    yellow14: false,
    purple14: false,
    green14: false,
    black14: false,
    mermaidsCapturedByPirates: 0,
    piratesCapturedBySkullKing: 0,
    skullKingCapturedByMermaid: false,
  });

  const calculateTotal = (state: BonusState): number => {
    let total = 0;
    if (state.yellow14) total += 10;
    if (state.purple14) total += 10;
    if (state.green14) total += 10;
    if (state.black14) total += 20;
    total += state.mermaidsCapturedByPirates * 20;
    total += state.piratesCapturedBySkullKing * 30;
    if (state.skullKingCapturedByMermaid) total += 40;
    return total;
  };

  useEffect(() => {
    onBonusChange(calculateTotal(bonuses));
  }, [bonuses, onBonusChange]);

  const handleCheckboxChange = (field: keyof BonusState) => {
    setBonuses({ ...bonuses, [field]: !bonuses[field as keyof BonusState] });
  };

  const handleNumberChange = (field: keyof BonusState, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setBonuses({ ...bonuses, [field]: numValue });
    }
  };

  const totalBonus = calculateTotal(bonuses);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">{playerName}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Bid: {bid || '?'} | Tricks: {tricks || '?'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">Bonus</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
            +{totalBonus}
          </p>
        </div>
      </div>

      {/* Standard Suit 14s */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
          Standard Suit 14s (10 pts each)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bonuses.yellow14}
              onChange={() => handleCheckboxChange('yellow14')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Yellow #14</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bonuses.purple14}
              onChange={() => handleCheckboxChange('purple14')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Purple #14</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bonuses.green14}
              onChange={() => handleCheckboxChange('green14')}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Green #14</span>
          </label>
        </div>
      </div>

      {/* Black Suit 14 */}
      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
          Black Suit 14 (20 pts)
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={bonuses.black14}
            onChange={() => handleCheckboxChange('black14')}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Black #14</span>
        </label>
      </div>

      {/* Special Card Bonuses */}
      <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
          Special Cards
        </p>

        <div className="flex items-center gap-3">
          <label className="flex-1 text-sm text-gray-700 dark:text-gray-300">
            Mermaids captured by Pirates (20 pts each)
          </label>
          <input
            type="number"
            min="0"
            value={bonuses.mermaidsCapturedByPirates || ''}
            onChange={(e) => handleNumberChange('mermaidsCapturedByPirates', e.target.value)}
            className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="0"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex-1 text-sm text-gray-700 dark:text-gray-300">
            Pirates captured by Skull King (30 pts each)
          </label>
          <input
            type="number"
            min="0"
            value={bonuses.piratesCapturedBySkullKing || ''}
            onChange={(e) => handleNumberChange('piratesCapturedBySkullKing', e.target.value)}
            className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="0"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={bonuses.skullKingCapturedByMermaid}
            onChange={() => handleCheckboxChange('skullKingCapturedByMermaid')}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Skull King captured by Mermaid (40 pts)
          </span>
        </label>
      </div>
    </div>
  );
}
