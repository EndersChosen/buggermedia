/**
 * Visual themes for games.
 *
 * A theme is applied with `data-theme="<id>"` on a wrapper (see ThemeShell).
 * Its CSS (app/themes.css) re-tints Tailwind's palette variables inside that
 * wrapper, swaps fonts and adds an animated backdrop, so every component
 * picks up the look without per-game styling code.
 */

export const THEME_IDS = [
  'classic',
  'felt',
  'pirate',
  'vault',
  'dice',
  'railway',
  'fantasy',
  'space',
  'garden',
  'arcade',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeInfo {
  id: ThemeId;
  label: string;
  /** Who it suits; also shown to the AI when it picks a theme. */
  suits: string;
  /** Glyphs for the win celebration burst. */
  confetti: string[];
  /** Glyph used as the theme's emblem on library tiles. */
  emblem: string;
}

export const THEMES: Record<ThemeId, ThemeInfo> = {
  classic: {
    id: 'classic',
    label: 'Classic',
    suits: 'neutral fallback when nothing else fits',
    confetti: ['✦', '●', '▲', '■'],
    emblem: '✦',
  },
  felt: {
    id: 'felt',
    label: 'Card table',
    suits: 'traditional card games with a standard deck (Hearts, Spades, Rummy, Oh Hell, Euchre, Cribbage, Gin)',
    confetti: ['♠', '♥', '♦', '♣'],
    emblem: '♠',
  },
  pirate: {
    id: 'pirate',
    label: 'High seas',
    suits: 'pirates, ships, oceans, treasure (Skull King)',
    confetti: ['✦', '☠', '⚓', '✧'],
    emblem: '☠',
  },
  vault: {
    id: 'vault',
    label: 'Money vault',
    suits: 'money, trading, business, collecting assets (Cover Your Assets, Monopoly Deal)',
    confetti: ['$', '¢', '✦', '$'],
    emblem: '$',
  },
  dice: {
    id: 'dice',
    label: 'Dice party',
    suits: 'dice games and light party games (Yahtzee, Farkle, Qwixx, Liar\'s Dice)',
    confetti: ['⚀', '⚂', '⚄', '⚅'],
    emblem: '⚄',
  },
  railway: {
    id: 'railway',
    label: 'Old railway',
    suits: 'trains, maps, travel, routes, the Old West (Ticket to Ride)',
    confetti: ['✦', '★', '◆', '✧'],
    emblem: '🚂',
  },
  fantasy: {
    id: 'fantasy',
    label: 'Dragon\'s keep',
    suits: 'fantasy, magic, dragons, medieval, adventure',
    confetti: ['✧', '✦', '❖', '✶'],
    emblem: '✶',
  },
  space: {
    id: 'space',
    label: 'Deep space',
    suits: 'space, sci-fi, planets, robots, the future',
    confetti: ['★', '✦', '●', '✧'],
    emblem: '★',
  },
  garden: {
    id: 'garden',
    label: 'Garden',
    suits: 'nature, animals, birds, gardens, farming, food (Wingspan, Sushi Go)',
    confetti: ['❀', '✿', '❁', '✾'],
    emblem: '❀',
  },
  arcade: {
    id: 'arcade',
    label: 'Neon arcade',
    suits: 'fast, loud, competitive party games, word and trivia games, retro video-game vibes (Uno, Exploding Kittens)',
    confetti: ['■', '▲', '●', '◆'],
    emblem: '▲',
  },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

/** Themes for the hand-built trackers. */
export const BUILT_IN_THEMES: Record<string, ThemeId> = {
  'skull-king': 'pirate',
  'cover-your-assets': 'vault',
  spades: 'felt',
};

const KEYWORDS: Array<[ThemeId, RegExp]> = [
  ['pirate', /\b(pirate|skull|ship|sea|ocean|treasure|captain|sail|kraken|island)/i],
  ['vault', /\b(money|cash|dollar|asset|bank|trade|stock|million|coin|business|deal|market)/i],
  ['railway', /\b(train|rail|route|ticket to ride|map|travel|city|cities|station|west)/i],
  ['dice', /\b(dice|die\b|yahtzee|farkle|roll|qwixx)/i],
  ['space', /\b(space|planet|galaxy|star|alien|robot|rocket|mars|cosmic|sci-?fi)/i],
  ['fantasy', /\b(dragon|wizard|magic|spell|knight|castle|quest|dungeon|kingdom|elf|orc|fantasy)/i],
  ['garden', /\b(bird|garden|flower|farm|animal|tree|forest|nature|sushi|food|fruit|wing)/i],
  ['arcade', /\b(uno|party|kitten|trivia|word|speed|neon|arcade|retro)/i],
  ['felt', /\b(hearts|spades|trick|rummy|bridge|euchre|cribbage|gin\b|poker|canasta|deck|card game|playing cards|suits?\b|bids?\b|bidding)/i],
];

/** Best-guess theme from a game's name and description. */
export function guessTheme(text: string): ThemeId {
  for (const [id, re] of KEYWORDS) if (re.test(text)) return id;
  return 'classic';
}

export function themeForCard(card: { theme?: string | null; name: string; description: string }): ThemeId {
  return isThemeId(card.theme) ? card.theme : guessTheme(`${card.name} ${card.description}`);
}
