import { GameRules } from '@/@types/game.types';

export const skRules: GameRules = {
  overview:
    'Skull King is a trick-taking game where players bid on the number of tricks they will win each round. Accurate bidding and strategic play earn you points over 10 rounds.',
  setup: [
    'Shuffle the deck of 66 cards (numbered cards, special cards, and character cards)',
    'Determine the dealer for the first round',
    'The game is played over exactly 10 rounds',
  ],
  gameplay: [
    'Round 1: Deal 1 card per player, Round 2: 2 cards, up to Round 10: 10 cards',
    'Players secretly bid how many tricks they think they will win',
    'Play tricks - highest card or special card wins the trick',
    'Pirates beat numbered cards, Mermaids beat Pirates, Skull King beats Mermaids',
    'Escape cards always lose but can save you from negative points',
  ],
  scoring: [
    'If you make your bid exactly: Earn 20 points per trick bid, plus 10 bonus points',
    'If you miss your bid: Lose 10 points for each trick difference',
    'Zero bid success: 10 points × number of cards dealt that round',
    'Zero bid failure: -10 points × number of cards dealt that round',
    'Bonus points for special card combinations (Pirates capturing Mermaids, etc.)',
  ],
  winning:
    'After 10 rounds, the player with the highest total score wins!',
};
