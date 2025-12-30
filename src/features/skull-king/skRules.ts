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
    'If you make your bid exactly: Earn 20 points per trick bid',
    'If you miss your bid: Lose 10 points for each trick difference',
    'Zero bid success: 10 points × number of cards dealt that round',
    'Zero bid failure: -10 points × number of cards dealt that round',
    'Bonus points for special card combinations (Pirates capturing Mermaids, etc.)',
  ],
  winning:
    'After 10 rounds, the player with the highest total score wins!',
  fullRules: {
    sections: [
      {
        id: 'game-overview',
        title: 'Game Overview',
        content: `Skull King is a pirate-themed trick-taking card game for 2-6 players. Over 10 rounds of escalating complexity, players must predict exactly how many tricks they'll win. Successful predictions earn points, while failures cost you!

The game features a unique card hierarchy where special character cards - Pirates, Mermaids, and the fearsome Skull King - add strategic depth beyond traditional trick-taking games.

With elements of bidding, risk-taking, and careful play, Skull King combines accessibility with tactical gameplay. Each round grows in complexity as more cards are dealt, culminating in a thrilling 10-card finale.

The player with the highest score after 10 rounds becomes the Skull King!`,
      },
      {
        id: 'components',
        title: 'Game Components',
        content: `The Skull King deck contains 66 cards:

SUIT CARDS (52 cards):
- Four suits: Parrots (yellow), Maps (purple), Chests (green), Flags (black)
- Each suit has cards numbered 1-13
- Higher numbers beat lower numbers of the same suit

SPECIAL CARDS:
- 5 Escape cards (numbered)
- 5 Pirate cards (character cards)
- 2 Mermaid cards (character cards)
- 1 Skull King card (the most powerful card)
- 1 Scary Mary card (dual-purpose card)

BONUS CARDS:
- Loot cards for bonus points
- Kraken and White Whale expansion cards (if included)`,
      },
      {
        id: 'setup',
        title: 'Game Setup',
        content: `Preparing to Play:

1. Shuffle all 66 cards thoroughly
2. Choose a dealer (youngest player or random selection)
3. The dealer will rotate clockwise each round
4. Have paper and pencil ready to track bids and scores
5. Each player should have space in front of them for won tricks

The game is played over exactly 10 rounds, with an increasing number of cards each round.`,
      },
      {
        id: 'rounds',
        title: 'Round Structure',
        content: `Each round follows the same pattern:

ROUND PROGRESSION:
- Round 1: Deal 1 card to each player
- Round 2: Deal 2 cards to each player
- Round 3: Deal 3 cards to each player
- ...continuing up to...
- Round 10: Deal 10 cards to each player

ROUND SEQUENCE:
1. Deal cards
2. Players examine their hands
3. Bidding phase
4. Play tricks
5. Score the round`,
        subsections: [
          {
            id: 'dealing',
            title: 'Dealing Cards',
            content: `The dealer shuffles and deals cards face-down, one at a time, clockwise around the table. Each player receives a number of cards equal to the current round number.

After dealing, place the remaining deck aside. The top card of the remaining deck determines the trump suit (if it's a suit card). If it's a special card, there is no trump for that round.

TRUMP SUIT: Cards of the trump suit beat cards of other suits, regardless of number (e.g., a 2 of trump beats a 13 of another suit).`,
          },
          {
            id: 'bidding',
            title: 'Bidding Phase',
            content: `Each player predicts how many tricks they will win this round:

1. Starting with the player to the dealer's left, each player announces their bid
2. Bids range from 0 to the number of cards dealt (e.g., 0-5 in round 5)
3. Write down each player's bid
4. The dealer goes last and may NOT bid to make bids "equal" (if bids total 4 in round 5, dealer cannot bid 1)

ZERO BID: Bidding zero means you predict you won't win ANY tricks. This is risky but can be highly rewarding!

IMPORTANT: Bids are public information - everyone knows what everyone else bid.`,
          },
          {
            id: 'playing-tricks',
            title: 'Playing Tricks',
            content: `The player to the dealer's left leads the first trick:

TRICK-TAKING RULES:
1. The lead player plays any card from their hand
2. Moving clockwise, each player must FOLLOW SUIT if possible
3. If you cannot follow suit, you may play any card (including special cards)
4. The highest card of the led suit wins UNLESS:
   - A higher trump card was played
   - A special card beats everything

FOLLOWING SUIT: If the lead card is a numbered suit card, you must play a card of the same suit if you have one. If you don't have that suit, you can play any card.

The winner of the trick takes all cards played, places them face-down in their won tricks pile, and leads the next trick.`,
          },
        ],
      },
      {
        id: 'special-cards',
        title: 'Special Cards & Powers',
        content: `Special cards create unique gameplay situations and override normal rules:`,
        subsections: [
          {
            id: 'escape-cards',
            title: 'Escape Cards',
            content: `Escape cards (numbered 1-5) are your "get out of jail free" cards:

- An Escape card ALWAYS LOSES the trick
- Play an Escape when you don't want to win a trick
- Useful when you've already met your bid and want to avoid extra tricks
- Escape cards do NOT count as following suit
- You can always play an Escape regardless of what was led

STRATEGY: Save Escapes for when you've met your bid and need to avoid winning additional tricks.`,
          },
          {
            id: 'pirates',
            title: 'Pirate Cards',
            content: `5 different Pirate cards, each with unique artwork:

POWERS:
- Pirates beat ALL numbered cards (including 13s and trump cards)
- Pirates do NOT need to follow suit
- If multiple Pirates are played, the first one played wins
- Pirates do NOT beat Mermaids or the Skull King

BONUS POINTS:
- Capturing a Mermaid with a Pirate: +20 bonus points
- This bonus applies even if you miss your bid

STRATEGY: Pirates are powerful but can be beaten by Mermaids. Play them strategically!`,
          },
          {
            id: 'mermaids',
            title: 'Mermaid Cards',
            content: `2 Mermaid cards with enchanting artwork:

POWERS:
- Mermaids beat ALL Pirates
- Mermaids beat ALL numbered cards
- If multiple Mermaids are played, the first one played wins
- Mermaids do NOT beat the Skull King
- Mermaids do NOT need to follow suit

BONUS POINTS:
- Lose 20 points if your Mermaid is captured by a Pirate
- Capturing the Skull King with a Mermaid: +50 bonus points (very rare!)

STRATEGY: Mermaids are excellent for winning tricks, but watch out for the Skull King!`,
          },
          {
            id: 'skull-king',
            title: 'The Skull King',
            content: `The most powerful card in the game:

POWERS:
- The Skull King beats EVERYTHING (Pirates, Mermaids, all numbered cards)
- Only ONE Skull King exists in the deck
- Does NOT need to follow suit
- Can be played at any time

BONUS POINTS:
- Capturing a Pirate with the Skull King: +30 bonus points per Pirate
- If a Mermaid captures the Skull King: -50 points (and the Mermaid player gets +50!)

SPECIAL RULE: If the Skull King is played and no Pirates are in the trick, NO bonus points are awarded (except if captured by a Mermaid).

STRATEGY: The Skull King guarantees a trick win, but timing is everything for maximum bonus points!`,
          },
          {
            id: 'scary-mary',
            title: 'Scary Mary',
            content: `A unique dual-purpose card:

POWERS:
- When played, the player declares if it's being played as a Pirate OR Mermaid
- Functions exactly like the declared card type
- Follows all rules and bonuses of the declared type
- This choice is made when the card is played

STRATEGY: Ultimate flexibility! Use it as whatever you need at the moment.`,
          },
        ],
      },
      {
        id: 'scoring',
        title: 'Scoring System',
        content: `After all tricks are played, calculate scores:`,
        subsections: [
          {
            id: 'successful-bid',
            title: 'Successful Bid (Exact Match)',
            content: `If you won EXACTLY the number of tricks you bid:

SCORE: 20 points × number of tricks bid
EXAMPLE: Bid 3, won 3 tricks = 20 × 3 = 60 points

Any bonus points from special card captures are added to this base score.`,
          },
          {
            id: 'failed-bid',
            title: 'Failed Bid (Incorrect)',
            content: `If you won MORE or FEWER tricks than you bid:

PENALTY: -10 points × difference
EXAMPLE: Bid 3, won 1 trick = -10 × 2 = -20 points
EXAMPLE: Bid 2, won 4 tricks = -10 × 2 = -20 points

The penalty is the same whether you overbid or underbid.`,
          },
          {
            id: 'zero-bid',
            title: 'Zero Bid (Special Rules)',
            content: `Bidding zero has special high-risk, high-reward scoring:

IF SUCCESSFUL (won 0 tricks):
SCORE: 10 points × round number
EXAMPLE: Round 5, bid 0, won 0 = 10 × 5 = 50 points
EXAMPLE: Round 10, bid 0, won 0 = 10 × 10 = 100 points!

IF FAILED (won any tricks):
PENALTY: -10 points × round number
EXAMPLE: Round 5, bid 0, won 1 trick = -10 × 5 = -50 points

STRATEGY: Zero bids become more valuable and more risky in later rounds!`,
          },
          {
            id: 'bonus-points',
            title: 'Bonus Points',
            content: `Special card interactions award bonus points regardless of bid success:

PIRATE BONUSES:
+20 points: Pirate captures a Mermaid
+30 points: Skull King captures a Pirate

MERMAID BONUSES:
+50 points: Mermaid captures the Skull King
-20 points: Mermaid is captured by a Pirate

MULTIPLE BONUSES: If multiple special cards are in one trick, multiple bonuses can apply!

EXAMPLE: You play Skull King, the trick contains 2 Pirates = +60 bonus points (30 × 2)

IMPORTANT: Bonus points apply even if you miss your bid! They're calculated after the base score.`,
          },
        ],
      },
      {
        id: 'winning',
        title: 'Winning the Game',
        content: `After completing all 10 rounds:

1. Add up each player's total score from all rounds
2. The player with the HIGHEST total score wins
3. In case of a tie, the tied player who won their Round 10 bid (or came closest) wins

SCORING TIPS:
- Keep a running total for each player
- Negative scores are possible (and common!)
- A player can come from behind - even round 10 alone has many available points
- Strategic zero bids in later rounds can be game-changers`,
      },
      {
        id: 'strategy-guide',
        title: 'Strategy & Tips',
        content: `Master these strategies to become the Skull King:`,
        subsections: [
          {
            id: 'bidding-strategy',
            title: 'Bidding Strategy',
            content: `EARLY ROUNDS (1-3 cards):
- Conservative bids are safer
- Special cards are more likely to win
- Trump matters less with fewer cards

MID ROUNDS (4-7 cards):
- Consider your high cards and trump
- Watch for bid totals - if everyone bids high, low cards are valuable
- Special cards become more strategic

LATE ROUNDS (8-10 cards):
- Precise bidding becomes crucial
- You'll have more control with more cards
- Zero bids are extremely valuable but very risky

GENERAL TIPS:
- Count special cards played - there are limited Pirates and Mermaids
- If the dealer is restricted, that's valuable information
- Don't be afraid to adjust strategy based on current score`,
          },
          {
            id: 'playing-strategy',
            title: 'Playing Strategy',
            content: `WHEN LEADING:
- Lead with your strongest card to win the trick
- Lead weak cards if you've met your bid
- Consider what cards have been played

WHEN FOLLOWING:
- Only play as high as needed to win (if you want the trick)
- Save your trump and special cards when possible
- Use Escape cards to avoid unwanted tricks

SPECIAL CARD TIMING:
- Don't waste Pirates on low-value tricks
- Save the Skull King for a trick with Pirates (bonus points!)
- Play Mermaids early to establish trick control
- Use Escapes late when you've met your bid

DEFENSIVE PLAY:
- If you've met your bid, use Escapes and low cards
- Help prevent others from making their bids when safe
- Block high bids by winning tricks others need`,
          },
          {
            id: 'advanced-tactics',
            title: 'Advanced Tactics',
            content: `CARD COUNTING:
- Track which Pirates have been played
- Note if the Skull King has appeared
- Remember the trump suit

READING OPPONENTS:
- Players short on a suit will play off-suit
- Watch for defensive plays (Escapes after meeting bids)
- Note who's ahead in score (they may play more conservatively)

SCORE MANAGEMENT:
- If behind, take risks with zero bids
- If ahead, make conservative bids
- Remember: bonus points don't require bid success

DEALER ADVANTAGE:
- Bidding last gives you information
- Know the bid restriction as dealer
- Adjust strategy if bids are very high or low`,
          },
        ],
      },
      {
        id: 'quick-reference',
        title: 'Quick Reference',
        content: `CARD HIERARCHY (highest to lowest):
1. Skull King (beats everything)
2. Mermaid (beats everything except Skull King)
3. Pirate (beats all numbered cards)
4. Trump suit cards (beat non-trump)
5. Led suit cards (highest number wins)
6. Off-suit cards (cannot win)
7. Escape cards (always lose)

SCORING:
✓ Exact bid: 20 × tricks
✗ Wrong bid: -10 × difference
✓ Zero bid success: 10 × round number
✗ Zero bid fail: -10 × round number

BONUSES:
+20: Pirate captures Mermaid
+30: Skull King captures Pirate (each)
+50: Mermaid captures Skull King
-20: Pirate captures your Mermaid

BIDDING:
• Dealer bids last
• Dealer cannot make bids "even"
• Zero bid = predict no tricks won`,
      },
    ],
  },
};
