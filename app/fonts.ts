/**
 * Theme fonts (self-hosted by next/font; the browser only downloads a font
 * when a theme on the page actually uses it).
 */
import {
  Bungee,
  Cinzel,
  DM_Serif_Display,
  Fredoka,
  Inter,
  Lora,
  Orbitron,
  Pirata_One,
  Playfair_Display,
  Rye,
} from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const pirata = Pirata_One({ subsets: ['latin'], weight: '400', variable: '--font-pirata', display: 'swap' });
const dmSerif = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-dm-serif', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const fredoka = Fredoka({ subsets: ['latin'], variable: '--font-fredoka', display: 'swap' });
const rye = Rye({ subsets: ['latin'], weight: '400', variable: '--font-rye', display: 'swap' });
const cinzel = Cinzel({ subsets: ['latin'], variable: '--font-cinzel', display: 'swap' });
const orbitron = Orbitron({ subsets: ['latin'], variable: '--font-orbitron', display: 'swap' });
const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' });
const bungee = Bungee({ subsets: ['latin'], weight: '400', variable: '--font-bungee', display: 'swap' });

export const fontVariables = [inter, pirata, dmSerif, playfair, fredoka, rye, cinzel, orbitron, lora, bungee]
  .map((f) => f.variable)
  .join(' ');
