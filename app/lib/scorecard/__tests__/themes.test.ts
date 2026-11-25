import { describe, expect, it } from 'vitest';
import { BUILT_IN_THEMES, guessTheme, isThemeId, THEME_IDS, THEMES, themeForCard } from '@/lib/themes';
import { validateScoreCard } from '../validate';
import { heartsCard } from './fixtures';

describe('themes', () => {
  it('has metadata for every theme id', () => {
    for (const id of THEME_IDS) {
      expect(THEMES[id].id).toBe(id);
      expect(THEMES[id].confetti.length).toBeGreaterThan(0);
    }
    expect(Object.values(BUILT_IN_THEMES).every(isThemeId)).toBe(true);
  });

  it.each([
    ['Hearts: avoid the queen of spades, a trick-taking card game', 'felt'],
    ['Yahtzee: roll five dice', 'dice'],
    ['Ticket to Ride: claim train routes across the map', 'railway'],
    ['Skull King pirate bidding', 'pirate'],
    ['Monopoly Deal: collect money and property', 'vault'],
    ['Wingspan: attract birds to your wildlife preserves', 'garden'],
    ['Dungeon quest with dragons and wizards', 'fantasy'],
    ['Race across the galaxy to colonise planets', 'space'],
    ['My game: A custom score card.', 'classic'],
  ])('guesses a theme for "%s"', (text, expected) => {
    expect(guessTheme(text)).toBe(expected);
  });

  it('prefers the card\'s own theme and falls back to a guess', () => {
    expect(themeForCard({ ...heartsCard, theme: 'space' })).toBe('space');
    expect(themeForCard({ ...heartsCard, theme: null })).toBe('felt');
    expect(themeForCard({ ...heartsCard, theme: 'not-a-theme' })).toBe('felt');
  });

  it('validates the theme field', () => {
    expect(validateScoreCard({ ...heartsCard, theme: 'pirate' }).ok).toBe(true);
    const card = structuredClone(heartsCard) as unknown as Record<string, unknown>;
    delete card.theme;
    expect(validateScoreCard(card).card?.theme).toBeNull();
    expect(validateScoreCard({ ...heartsCard, theme: 'neon-green' }).ok).toBe(false);
  });
});
