import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { ASSET_CARDS, WILD_CARDS, ADVANCED_WILD_CARDS } from '../cyaCardTypes';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CYAPlayerCardInputProps {
  playerName: string;
  cardCounts: Record<string, number>;
  onCardCountsChange: (cardCounts: Record<string, number>) => void;
}

export function CYAPlayerCardInput({
  playerName,
  cardCounts,
  onCardCountsChange
}: CYAPlayerCardInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
      const card = [...ASSET_CARDS, ...WILD_CARDS, ...ADVANCED_WILD_CARDS].find(
        c => c.name === cardName
      );
      return sum + (card ? card.value * count : 0);
    }, 0);
  }, [cardCounts]);

  const handleCountChange = (cardName: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      const newCounts = { ...cardCounts };
      if (numValue === 0) {
        delete newCounts[cardName];
      } else {
        newCounts[cardName] = numValue;
      }
      onCardCountsChange(newCounts);
    }
  };

  const renderCardInput = (cardName: string, cardValue: number) => {
    const count = cardCounts[cardName] || 0;
    const subtotal = count * cardValue;

    return (
      <div key={cardName} className="flex items-center gap-2 py-1.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{cardName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(cardValue)}</p>
        </div>
        <div className="w-16">
          <Input
            type="number"
            min="0"
            value={count || ''}
            onChange={(e) => handleCountChange(cardName, e.target.value)}
            placeholder="0"
            className="text-center text-sm h-8"
          />
        </div>
        <div className="w-20 text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {subtotal > 0 ? formatCurrency(subtotal) : '—'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-900 dark:text-white">{playerName}</span>
          {total > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({Object.values(cardCounts).reduce((sum, count) => sum + count, 0)} cards)
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(total)}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>

      {/* Expandable card selection */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-white dark:bg-gray-900 max-h-96 overflow-y-auto">
          {/* Asset Cards */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Asset Cards
            </h4>
            <div className="space-y-1">
              {ASSET_CARDS.map(card => renderCardInput(card.name, card.value))}
            </div>
          </div>

          {/* Wild Cards */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Wild Cards
            </h4>
            <div className="space-y-1">
              {WILD_CARDS.map(card => renderCardInput(card.name, card.value))}
            </div>
          </div>

          {/* Advanced Wild Cards */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Advanced Wild Cards
            </h4>
            <div className="space-y-1">
              {ADVANCED_WILD_CARDS.map(card => renderCardInput(card.name, card.value))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
