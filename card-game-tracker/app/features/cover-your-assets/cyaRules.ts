import { GameRules } from '@/types/game.types';

export const cyaRules: GameRules = {
  overview:
    'Cover Your Assets is a fast-paced card game where players collect and protect valuable asset pairs. The first player to reach $1,000,000 wins!',
  setup: [
    'Shuffle the deck and deal 5 cards to each player',
    'Place the remaining cards face down as the draw pile',
    'Flip a card from the deck to start the discard pile',
    'The player to the left of the dealer goes first',
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
2. Deal 5 cards face-down to each player
3. Place the remaining cards face-down in the center as the draw pile
4. Flip the top card of the draw pile to start the discard pile
5. Each player looks at their hand (keep cards hidden from other players)
6. The player to the left of the dealer goes first`,
      },
      {
        id: 'gameplay',
        title: 'How to Play',
        content: `The game is played in turns, moving clockwise around the table.`,
        subsections: [
          {
            id: 'turn-structure',
            title: 'Turn Structure',
            content: `On your turn you must take one of the following actions:

* Form a set
* Discard
* Challenge (attempt to steal)`,
          },
          {
            id: 'forming-sets',
            title: 'Forming a set',
            content: `Form a Set of matching pairs to add to your asset pile:':

You must form a set in one of three ways:
• Pairing two identical cards from your hand.
• Pairing a card from your hand with an
identical card from the top of the discard pile.
• Pairing in the above mentioned ways, but with one
of the two cards being a Wild. Note: You must always
place a Wild below an Asset when building sets!
To clarify, a pair can be either two identical Assets,
or an Asset and a Wild (Silver or Gold). However,
you may not form a set with two Wilds or with
more than two cards. It must be a pair. Lastly, sets
in your stack are never combined with previously
played sets even if they are the same Asset.
Stacking your sets:
To keep sets separated, each time you add
a new set to your pile you'll place it on
top of the previous set, alternating
between horizontal and vertical
orientation, even if it is the same
Asset as a previously played set`,
          },
          {
            id: 'discarding',
            title: 'Discarding Cards',
            content: `Discard a card from your hand, face up, onto the discard
pile. There can be a lot of strategy in choosing this action`,
          },
          {
            id: 'stealing',
            title: 'Challenge (Attempt to Steal)',
            content: `The top set in each stack is vulnerable to being taken by
another player. To challenge another player's top set, place
an Asset matching that set, or a Wild card, in front of the
player you are challenging. Note: Assets and Wilds are of
equal power for stealing, even though they have a different
value at the end of the game.
The defender may protect their set by playing a matching
Asset or Wild from their hand. You may each challenge
and defend for as long as you want or are able.
When one player is no longer able to defend, or chooses
not to, that player loses the challenge. If the challenger
wins, they take the set. If the defender wins, they keep it.
Whoever wins also gets to keep all cards that were used
in the battle. As a reminder, any wilds must be placed
below Assets.

Note: You may not draw new cards during a challenge.

Two additional rules apply to challenging:
• The first (bottom) set formed in each player's
stack is safe and may not be stolen.
• You must form at least one set before stealing
any sets from other players.

Example Challenge: Jarom attempts to take Sarah's Classic Auto set.
He challenges with a Classic Auto. Sarah responds with Gold
(Wild). Jarom responds with a Classic Auto. Sarah cannot
respond and loses. Jarom keeps the three played cards as
part of his new set.`,
          },
          {
            id: 'ending-your-turn',
            title: 'Ending Your Turn',
            content: `After completing one of the three possible actions (form a
set, discard, or challenge), draw back up to five cards from
the deck. After you've drawn, if another player used cards
to defend a set during your turn, they draw back up to five
as well. The player to your left takes their turn next.`,
          },
                    {
            id: 'ending-the-round',
            title: 'Ending the Round',
            content: `When the draw deck is depleted, play continues until
everyone has played all of the remaining cards in their
hand. As always, passing on your turn is not an option. If
you choose not to form a set or challenge, you must take
the discard action. `,
          },
                    {
            id: 'scoring',
            title: 'Scoring',
            content: `Tally your score at the end of the round by adding up the
value of each card in your stack. Adding them up in piles
of $100k each makes this a little easier.`,
          },
    {
            id: 'ending-the-game',
            title: 'Ending the Game',
            content: `You can choose the following ways to end a game:
• Classic Game: Play as many rounds as required for a
player to pass $1,000,000 total. That player wins!
• Quick Game: The player with the highest score at the
end of one round wins. Congratulations!
• Highest score after 3 rounds: Record scores after
each round. After 3 rounds, the highest score wins!
• First to win 2 rounds: Only record which player has
the highest score at the end of each round. The first
player to win 2 rounds wins!`,
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
1. Draw to 5 cards
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
