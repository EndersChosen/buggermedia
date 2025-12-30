import { useState, useEffect } from 'react';
import { SKBonusDetails } from '@/@types/game.types';

interface BonusState {
  yellow14: boolean;
  purple14: boolean;
  green14: boolean;
  black14: boolean;
  mermaidsCapturedByPirates: number;
  piratesCapturedBySkullKing: number;
  skullKingCapturedByMermaid: boolean;
}

interface BonusLimits {
  yellow14Available: boolean;
  purple14Available: boolean;
  green14Available: boolean;
  black14Available: boolean;
  mermaidsRemaining: number;
  piratesRemaining: number;
  skullKingAvailable: boolean;
}

interface SKPlayerBonusInputProps {
  playerName: string;
  bid: string;
  tricks: string;
  onBonusChange: (totalBonus: number, bonusDetails: SKBonusDetails) => void;
  initialBonusDetails?: SKBonusDetails;
  bonusLimits: BonusLimits;
}

export function SKPlayerBonusInput({
  playerName,
  bid,
  tricks,
  onBonusChange,
  initialBonusDetails,
  bonusLimits,
}: SKPlayerBonusInputProps) {
  const [bonuses, setBonuses] = useState<BonusState>(initialBonusDetails || {
    yellow14: false,
    purple14: false,
    green14: false,
    black14: false,
    mermaidsCapturedByPirates: 0,
    piratesCapturedBySkullKing: 0,
    skullKingCapturedByMermaid: false,
  });

  // Check if player is eligible for bonuses (bid must equal tricks)
  const isBonusEligible = bid !== '' && tricks !== '' && bid === tricks;

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

  // Update bonuses when initial values change (e.g., when editing a different round)
  useEffect(() => {
    if (initialBonusDetails) {
      setBonuses(initialBonusDetails);
    } else {
      // Reset to defaults when starting a new round
      setBonuses({
        yellow14: false,
        purple14: false,
        green14: false,
        black14: false,
        mermaidsCapturedByPirates: 0,
        piratesCapturedBySkullKing: 0,
        skullKingCapturedByMermaid: false,
      });
    }
  }, [initialBonusDetails]);

  useEffect(() => {
    onBonusChange(calculateTotal(bonuses), bonuses);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonuses]);

  const handleCheckboxChange = (field: keyof BonusState) => {
    setBonuses({ ...bonuses, [field]: !bonuses[field as keyof BonusState] });
  };

  const handleNumberChange = (field: keyof BonusState, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      // Enforce max limits for special cards
      let cappedValue = numValue;
      if (field === 'mermaidsCapturedByPirates') {
        cappedValue = Math.min(numValue, bonusLimits.mermaidsRemaining);
      } else if (field === 'piratesCapturedBySkullKing') {
        cappedValue = Math.min(numValue, bonusLimits.piratesRemaining);
      }
      setBonuses({ ...bonuses, [field]: cappedValue });
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

      {!isBonusEligible && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3 mb-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Bonus points only available when bid matches tricks won
          </p>
        </div>
      )}

      {/* Standard Suit 14s */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
          Standard Suit 14s (10 pts each)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className={`flex items-center gap-2 ${!isBonusEligible || !bonusLimits.yellow14Available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={bonuses.yellow14}
              onChange={() => handleCheckboxChange('yellow14')}
              disabled={!isBonusEligible || !bonusLimits.yellow14Available}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Yellow #14 {!bonusLimits.yellow14Available && isBonusEligible && '(taken)'}
            </span>
          </label>
          <label className={`flex items-center gap-2 ${!isBonusEligible || !bonusLimits.purple14Available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={bonuses.purple14}
              onChange={() => handleCheckboxChange('purple14')}
              disabled={!isBonusEligible || !bonusLimits.purple14Available}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Purple #14 {!bonusLimits.purple14Available && isBonusEligible && '(taken)'}
            </span>
          </label>
          <label className={`flex items-center gap-2 ${!isBonusEligible || !bonusLimits.green14Available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={bonuses.green14}
              onChange={() => handleCheckboxChange('green14')}
              disabled={!isBonusEligible || !bonusLimits.green14Available}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Green #14 {!bonusLimits.green14Available && isBonusEligible && '(taken)'}
            </span>
          </label>
        </div>
      </div>

      {/* Black Suit 14 */}
      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">
          Black Suit 14 (20 pts)
        </p>
        <label className={`flex items-center gap-2 ${!isBonusEligible || !bonusLimits.black14Available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={bonuses.black14}
            onChange={() => handleCheckboxChange('black14')}
            disabled={!isBonusEligible || !bonusLimits.black14Available}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Black #14 {!bonusLimits.black14Available && isBonusEligible && '(taken)'}
          </span>
        </label>
      </div>

      {/* Special Card Bonuses */}
      <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
          Special Cards
        </p>

        <div className="flex items-center gap-3">
          <label className={`flex-1 text-sm ${!isBonusEligible || bonusLimits.mermaidsRemaining === 0 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
            Mermaids captured by Pirates (20 pts each)
          </label>
          <input
            type="number"
            min="0"
            max={bonusLimits.mermaidsRemaining}
            value={bonuses.mermaidsCapturedByPirates || ''}
            onChange={(e) => handleNumberChange('mermaidsCapturedByPirates', e.target.value)}
            disabled={!isBonusEligible || bonusLimits.mermaidsRemaining === 0}
            className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="0"
          />
          {isBonusEligible && bonusLimits.mermaidsRemaining < 2 && (
            <span className="text-xs text-gray-500">({bonusLimits.mermaidsRemaining} left)</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className={`flex-1 text-sm ${!isBonusEligible || bonusLimits.piratesRemaining === 0 ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
            Pirates captured by Skull King (30 pts each)
          </label>
          <input
            type="number"
            min="0"
            max={bonusLimits.piratesRemaining}
            value={bonuses.piratesCapturedBySkullKing || ''}
            onChange={(e) => handleNumberChange('piratesCapturedBySkullKing', e.target.value)}
            disabled={!isBonusEligible || bonusLimits.piratesRemaining === 0}
            className="w-16 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="0"
          />
          {isBonusEligible && bonusLimits.piratesRemaining < 5 && (
            <span className="text-xs text-gray-500">({bonusLimits.piratesRemaining} left)</span>
          )}
        </div>

        <label className={`flex items-center gap-2 ${!isBonusEligible || !bonusLimits.skullKingAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
          <input
            type="checkbox"
            checked={bonuses.skullKingCapturedByMermaid}
            onChange={() => handleCheckboxChange('skullKingCapturedByMermaid')}
            disabled={!isBonusEligible || !bonusLimits.skullKingAvailable}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Skull King captured by Mermaid (40 pts) {!bonusLimits.skullKingAvailable && isBonusEligible && '(taken)'}
          </span>
        </label>
      </div>
    </div>
  );
}
