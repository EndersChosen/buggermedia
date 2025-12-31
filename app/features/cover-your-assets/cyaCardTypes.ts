export interface CardType {
  name: string;
  value: number;
  category: 'asset' | 'wild' | 'advanced-wild' | 'action';
}

export const CYA_CARDS: CardType[] = [
  // Asset Cards
  { name: 'Baseball Cards', value: 5000, category: 'asset' },
  { name: 'Coin Collection', value: 5000, category: 'asset' },
  { name: 'Piggy Bank', value: 5000, category: 'asset' },
  { name: 'Cash under the Mattress', value: 10000, category: 'asset' },
  { name: 'Bank Account', value: 10000, category: 'asset' },
  { name: 'Stocks', value: 10000, category: 'asset' },
  { name: 'Speed Boat', value: 15000, category: 'asset' },
  { name: 'Jewels', value: 15000, category: 'asset' },
  { name: 'Classic Auto', value: 15000, category: 'asset' },
  { name: 'Home', value: 20000, category: 'asset' },

  // Wild Cards
  { name: 'Silver', value: 25000, category: 'wild' },
  { name: 'Gold', value: 50000, category: 'wild' },

  // Advanced Wild Cards
  { name: 'Penny Jar', value: 1000, category: 'advanced-wild' },

  // Action Cards (no value)
  { name: 'Swap', value: 0, category: 'action' },
  { name: 'Move', value: 0, category: 'action' },
];

export const ASSET_CARDS = CYA_CARDS.filter(c => c.category === 'asset');
export const WILD_CARDS = CYA_CARDS.filter(c => c.category === 'wild');
export const ADVANCED_WILD_CARDS = CYA_CARDS.filter(c => c.category === 'advanced-wild');
export const ACTION_CARDS = CYA_CARDS.filter(c => c.category === 'action');
