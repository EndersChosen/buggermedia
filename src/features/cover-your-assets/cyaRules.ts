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
  fullRules: {
    sections: [
      {
        id: 'game-overview',
        title: 'Game Overview',
        content: `Cover Your Assets is a fast-paced card game of matching and stealing. Players compete to collect valuable asset cards by creating matching pairs. But watch out - other players can steal your top asset if they have a matching card! Protect your wealth by covering your assets with additional matching cards.

The game combines elements of strategy, luck, and quick thinking. With assets ranging from piggy banks to gold bars, players must decide when to play their cards, when to steal from opponents, and when to protect their own collections.

The first player to accumulate $1,000,000 in total asset value wins the game!`,
      },
      {
        id: 'components',
        title: 'Game Components',
        content: `The Cover Your Assets deck contains 110 cards consisting of:
- Asset Cards: Various assets with different dollar values
- Action Cards: Special cards that add strategy to gameplay
- Wild Cards: Can be used as any asset type

Each asset card displays:
- Asset name and illustration
- Dollar value
- Asset type indicator`,
      },
      {
        id: 'setup',
        title: 'Game Setup',
        content: `To set up the game:

1. Shuffle the entire deck thoroughly
2. Deal 4 cards face-down to each player
3. Place the remaining cards face-down in the center as the draw pile
4. Leave space next to the draw pile for a discard pile
5. Each player looks at their hand (keep cards hidden from other players)
6. Determine who goes first (youngest player, or player who most recently made a purchase)`,
      },
      {
        id: 'gameplay',
        title: 'How to Play',
        content: `The game is played in turns, moving clockwise around the table.`,
        subsections: [
          {
            id: 'turn-structure',
            title: 'Turn Structure',
            content: `On your turn, follow these steps in order:

1. DRAW: Draw cards from the draw pile until you have 4 cards in your hand
2. PLAY: You may take ONE of these actions:
   - Play a matching pair to start a new asset pile
   - Play a card to steal an opponent's top asset
   - Play a card to cover one of your own assets
   - Play an action card (if applicable)
3. DISCARD: If you cannot or choose not to play, you may discard one card`,
          },
          {
            id: 'matching-pairs',
            title: 'Playing Matching Pairs',
            content: `To start a new asset pile:

- Play two matching asset cards from your hand face-up in front of you
- These cards form the base of an asset pile
- You can have multiple asset piles at the same time
- Each pile is kept separate and visible to all players
- The top card of each pile determines what can steal or cover it`,
          },
          {
            id: 'stealing',
            title: 'Stealing Assets',
            content: `You can steal an opponent's top asset pair if you have a matching card:

1. Play a card from your hand that matches the TOP card of an opponent's asset pile
2. Challenge: The opponent can defend by playing a matching card from their hand
3. Counter-Challenge: You can challenge back with another matching card
4. This continues until one player cannot match
5. The last player to play a matching card takes the entire pile

IMPORTANT: You can only steal the TOP asset pair, not piles covered by other cards
IMPORTANT: Only cards played during the challenge count - cards revealed for defense don't add to the pile`,
          },
          {
            id: 'covering',
            title: 'Covering Your Assets',
            content: `Protect your assets from being stolen:

- Play a matching card on top of one of your asset piles
- This "covers" the asset, making it safe from theft
- Only the TOP card can be stolen or covered
- You can cover the same pile multiple times for added protection
- Each cover adds the card's value to that pile's total`,
          },
          {
            id: 'action-cards',
            title: 'Action Cards',
            content: `Special action cards provide unique abilities:

SWAP: Trade one of your asset piles with an opponent's pile (both top cards must match)
DOUBLE: Place on top of an asset pile to double its value
BREAK THE BANK: Immediately play two pairs on your turn
SHUFFLE: Shuffle the discard pile back into the draw pile

Action cards are played during your turn and follow the specific instructions on the card.`,
          },
          {
            id: 'wild-cards',
            title: 'Wild Cards',
            content: `Wild cards can be used as any asset type:

- Can be played as part of a matching pair
- Can be used to steal or cover any asset
- When challenged, you must play the asset type the wild represents
- Very valuable for completing difficult matches`,
          },
        ],
      },
      {
        id: 'winning',
        title: 'Winning the Game',
        content: `The game ends when any player reaches $1,000,000 in total asset value.

At the end of each round, players add up the dollar values of ALL cards in their asset piles (pairs, covered assets, and protecting cards).

The first player to reach or exceed $1,000,000 immediately wins!

VARIANT: For shorter games, you can set the winning threshold to $500,000.
VARIANT: For longer games, play "best 2 out of 3" rounds.`,
      },
      {
        id: 'strategy-tips',
        title: 'Strategy Tips',
        content: `- Keep matching cards in your hand to defend against steals
- Cover high-value assets quickly to protect them
- Time your steals carefully - can you defend if challenged?
- Don't reveal your hand strength too early
- Watch what other players are collecting
- Balance between building your assets and stealing from others
- Wild cards are powerful - save them for crucial moments
- Remember that only the top card of each pile can be targeted`,
      },
      {
        id: 'quick-reference',
        title: 'Quick Reference',
        content: `TURN SEQUENCE:
1. Draw to 4 cards
2. Play a pair, steal, cover, or action card (or pass)
3. Discard if desired

TO STEAL:
- Match the TOP card of opponent's pile
- Defend with matching cards if challenged
- Last to match wins the pile

TO COVER:
- Play matching card on your own pile
- Makes it safe from theft
- Adds value to the pile

TO WIN:
- First to $1,000,000 in total asset value`,
      },
    ],
  },
};
