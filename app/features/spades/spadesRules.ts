import { GameRules } from '@/types/game.types';

export const spadesRules: GameRules = {
  overview:
    'Spades is a trick-taking card game for 4 players in partnerships. Teams bid on the number of tricks they will take, then play to fulfill their contract while accumulating as few bags (overtricks) as possible.',
  
  setup: [
    'Four players sit in partnerships across from each other (North/South vs East/West)',
    'Use a standard 52-card deck',
    'Deal all cards evenly (13 cards per player)',
    'Spades are always trump'
  ],
  
  gameplay: [
    'Each hand begins with bidding: players predict how many tricks they will win',
    'Bidding nil (0) is allowed - if successful, worth 100 points; if failed, -100 points',
    'The player to the left of the dealer leads first',
    'Players must follow suit if possible; if not, may play any card',
    'Spades cannot be led until they are "broken" (played when unable to follow suit) or a player only has spades',
    'Highest card of the led suit wins, unless a spade is played (spades always win)',
    'Play continues until all 13 tricks are played'
  ],
  
  scoring: [
    'If a team makes their bid: earn bid × 10 points plus 1 point per overtrick (bag)',
    'If a team fails their bid: lose bid × 10 points',
    'Successful nil bid: +100 points',
    'Failed nil bid: -100 points',
    'Every 10 bags accumulated: -100 points and bags reset to 0',
    'Bags carry over from hand to hand until 10 are reached'
  ],
  
  winning: 'First team to reach 500 points wins the game',
  
  fullRules: {
    sections: [
      {
        id: 'overview',
        title: 'Game Overview',
        content: 'Spades is a partnership trick-taking game where accuracy in bidding is crucial. Partners sit across from each other and combine their bids and tricks.'
      },
      {
        id: 'bidding',
        title: 'Bidding',
        content: 'Each player bids the number of tricks they expect to win (0-13). A bid of 0 is called "nil" and has special scoring. Partners\' bids are combined to form the team contract.'
      },
      {
        id: 'play',
        title: 'Card Play',
        content: 'Players must follow suit if able. Spades are trump and always beat other suits. The highest spade (or highest card of the led suit if no spades are played) wins the trick.'
      },
      {
        id: 'scoring-detail',
        title: 'Detailed Scoring',
        content: 'Making your bid earns bid × 10 points. Each overtrick (bag) is worth 1 point but accumulates. Every 10 bags incurs a -100 point penalty. Nil bids are worth +100 if successful, -100 if failed.'
      },
      {
        id: 'strategy',
        title: 'Strategy Tips',
        content: 'Communicate with your partner through bidding. Avoid accumulating bags when possible. Consider bidding nil when holding a weak hand with few high cards.'
      }
    ]
  }
};
