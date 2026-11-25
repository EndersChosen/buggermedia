import type { CSSProperties, ReactNode } from 'react';
import { THEMES, type ThemeId } from '@/lib/themes';

/** Deterministic 0..1 noise so the backdrop renders identically on server and client. */
function noise(i: number, k: number) {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const PARTICLES: Partial<Record<ThemeId, { glyphs: string[]; count: number; kind: string }>> = {
  felt: { glyphs: ['♠', '♥', '♦', '♣'], count: 14, kind: 'drift' },
  vault: { glyphs: ['$', '¢', '$', '◎'], count: 14, kind: 'rise' },
  dice: { glyphs: ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'], count: 12, kind: 'tumble' },
  garden: { glyphs: ['', '', '❀'], count: 16, kind: 'leaf' },
  fantasy: { glyphs: [''], count: 26, kind: 'ember' },
  space: { glyphs: [''], count: 60, kind: 'star' },
  pirate: { glyphs: ['✦', '✧'], count: 10, kind: 'sparkle' },
};

function Particles({ theme }: { theme: ThemeId }) {
  const spec = PARTICLES[theme];
  if (!spec) return null;
  return (
    <>
      {Array.from({ length: spec.count }, (_, i) => {
        const style = {
          '--x': `${(noise(i, 1) * 100).toFixed(2)}%`,
          '--y': `${(noise(i, 5) * 100).toFixed(2)}%`,
          '--d': `${(-noise(i, 2) * 30).toFixed(2)}s`,
          '--t': `${(14 + noise(i, 3) * 18).toFixed(2)}s`,
          '--s': (0.6 + noise(i, 4) * 1.1).toFixed(2),
          '--r': `${Math.round(noise(i, 6) * 360)}deg`,
        } as CSSProperties;
        return (
          <span key={i} className={`decor-p decor-${spec.kind}`} style={style}>
            {spec.glyphs[i % spec.glyphs.length]}
          </span>
        );
      })}
    </>
  );
}

function Train() {
  return (
    <svg className="decor-train" viewBox="0 0 220 60" aria-hidden="true">
      <g fill="currentColor">
        <rect x="8" y="22" width="70" height="26" rx="3" />
        <rect x="58" y="8" width="22" height="20" rx="2" />
        <rect x="18" y="12" width="10" height="12" />
        <path d="M78 34 h14 l8 14 h-22z" />
        <circle cx="24" cy="50" r="7" />
        <circle cx="48" cy="50" r="7" />
        <circle cx="70" cy="50" r="5" />
        <rect x="106" y="26" width="50" height="22" rx="3" />
        <circle cx="118" cy="50" r="6" />
        <circle cx="144" cy="50" r="6" />
        <rect x="162" y="26" width="50" height="22" rx="3" />
        <circle cx="174" cy="50" r="6" />
        <circle cx="200" cy="50" r="6" />
        <rect x="98" y="38" width="10" height="3" />
        <rect x="154" y="38" width="10" height="3" />
      </g>
      <g className="decor-smoke" fill="currentColor">
        <circle cx="23" cy="6" r="4" />
        <circle cx="16" cy="-2" r="5" />
        <circle cx="8" cy="-10" r="6" />
      </g>
    </svg>
  );
}

/** Animated, decorative background for a theme. Purely visual; hidden from assistive tech. */
export function ThemeBackdrop({ theme, contained = false }: { theme: ThemeId; contained?: boolean }) {
  return (
    <div className={`theme-backdrop ${contained ? 'is-contained' : ''}`} aria-hidden="true">
      <Particles theme={theme} />
      {theme === 'pirate' && (
        <>
          <div className="decor-moon" />
          <div className="decor-wave decor-wave-back" />
          <div className="decor-wave decor-wave-front" />
        </>
      )}
      {theme === 'railway' && (
        <>
          <div className="decor-track" />
          <Train />
        </>
      )}
      {theme === 'arcade' && (
        <>
          <div className="decor-sun" />
          <div className="decor-grid" />
        </>
      )}
      {theme === 'space' && <div className="decor-shooting" />}
    </div>
  );
}

interface ThemeShellProps {
  theme: ThemeId;
  children: ReactNode;
  /** Keep the backdrop inside this element instead of filling the viewport. */
  contained?: boolean;
  className?: string;
}

/**
 * Applies a game theme to everything inside it: palette, fonts and an
 * animated backdrop (full screen by default, or confined to the element).
 */
export function ThemeShell({ theme, children, contained = false, className = '' }: ThemeShellProps) {
  return (
    <div data-theme={theme} className={`theme-shell ${contained ? 'theme-contained' : ''} ${className}`}>
      <ThemeBackdrop theme={theme} contained={contained} />
      <div className="theme-content">{children}</div>
    </div>
  );
}

/** A one-shot burst of theme glyphs, for winner banners. */
export function Celebration({ theme }: { theme: ThemeId }) {
  const glyphs = THEMES[theme].confetti;
  return (
    <div className="celebration" aria-hidden="true">
      {Array.from({ length: 26 }, (_, i) => {
        const angle = noise(i, 7) * Math.PI * 2;
        const dist = 90 + noise(i, 8) * 160;
        const style = {
          '--dx': `${Math.round(Math.cos(angle) * dist)}px`,
          '--dy': `${Math.round(Math.sin(angle) * dist - 60)}px`,
          '--r': `${Math.round(noise(i, 9) * 720 - 360)}deg`,
          '--d': `${(noise(i, 10) * 0.25).toFixed(2)}s`,
          left: `${(10 + noise(i, 11) * 80).toFixed(1)}%`,
        } as CSSProperties;
        return (
          <span key={i} style={style}>
            {glyphs[i % glyphs.length]}
          </span>
        );
      })}
    </div>
  );
}
