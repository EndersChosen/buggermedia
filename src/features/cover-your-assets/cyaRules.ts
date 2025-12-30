import { GameRules } from '@/@types/game.types';

export const cyaRules: GameRules = {
  overview:
    'Cover Your Assets is a fast-paced card game where players collect and protect valuable asset pairs. The first player to reach $1,000,000 wins!',
  setup: [
    'Shuffle the deck and deal 4 cards to each player',
    'Place the remaining cards face down as the draw pile',
    'Create a discard pile next to the draw pile',
  ],
  gameplay: [
    'On your turn, draw cards until you have 4 in your hand',
    'Play matching pairs of assets face up in front of you',
    'Steal opponents\' top asset pairs by matching the card on top',
    'Cover your assets with additional matching cards to protect them',
  ],
  scoring: [
    'Each asset card has a dollar value printed on it',
    'Add up the values of all cards in your completed asset piles',
    'Only completed pairs and covered assets count toward your total',
  ],
  winning:
    'The first player to accumulate $1,000,000 in asset values wins the game!',
};
