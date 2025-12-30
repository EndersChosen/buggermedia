import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ASSET_CARDS, WILD_CARDS, ADVANCED_WILD_CARDS, ACTION_CARDS } from '../cyaCardTypes';

interface CYAScoreCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyScore?: (total: number) => void;
}

export function CYAScoreCalculator({ isOpen, onClose, onApplyScore }: CYAScoreCalculatorProps) {
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const total = useMemo(() => {
    return Object.entries(cardCounts).reduce((sum, [cardName, count]) => {
      const card = [...ASSET_CARDS, ...WILD_CARDS, ...ADVANCED_WILD_CARDS, ...ACTION_CARDS].find(
        c => c.name === cardName
      );
      return sum + (card ? card.value * count : 0);
    }, 0);
  }, [cardCounts]);

  const handleCountChange = (cardName: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setCardCounts(prev => ({
        ...prev,
        [cardName]: numValue,
      }));
    }
  };

  const handleReset = () => {
    setCardCounts({});
  };

  const handleApply = () => {
    if (onApplyScore) {
      onApplyScore(total);
    }
    handleReset();
    onClose();
  };

  const renderCardInput = (cardName: string, cardValue: number) => {
    const count = cardCounts[cardName] || 0;
    const subtotal = count * cardValue;

    return (
      <div key={cardName} className="flex items-center gap-3 py-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{cardName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(cardValue)} each</p>
        </div>
        <div className="w-20">
          <Input
            type="number"
            min="0"
            value={count || ''}
            onChange={(e) => handleCountChange(cardName, e.target.value)}
            placeholder="0"
            className="text-center"
          />
        </div>
        <div className="w-28 text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {subtotal > 0 ? formatCurrency(subtotal) : '—'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Score Calculator" size="lg">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        {/* Asset Cards */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 sticky top-0 bg-white dark:bg-gray-800 py-2 z-10">
            Asset Cards
          </h3>
          <div className="space-y-1">
            {ASSET_CARDS.map(card => renderCardInput(card.name, card.value))}
          </div>
        </div>

        {/* Wild Cards */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Wild Cards
          </h3>
          <div className="space-y-1">
            {WILD_CARDS.map(card => renderCardInput(card.name, card.value))}
          </div>
        </div>

        {/* Advanced Wild Cards */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Advanced Wild Cards
          </h3>
          <div className="space-y-1">
            {ADVANCED_WILD_CARDS.map(card => renderCardInput(card.name, card.value))}
          </div>
        </div>

        {/* Action Cards */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Action Cards
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Action cards have no point value
          </p>
          <div className="space-y-1">
            {ACTION_CARDS.map(card => (
              <div key={card.name} className="py-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">{card.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Total and Actions */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-bold text-gray-900 dark:text-white">Total:</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(total)}
          </span>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleReset} className="flex-1">
            Reset
          </Button>
          {onApplyScore && (
            <Button onClick={handleApply} className="flex-1" disabled={total === 0}>
              Apply Score
            </Button>
          )}
          {!onApplyScore && (
            <Button onClick={onClose} className="flex-1">
              Close
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
