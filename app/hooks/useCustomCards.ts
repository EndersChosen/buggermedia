'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from '@/types/game.types';
import type { ScoreCard } from '@/lib/scorecard/schema';
import { validateScoreCard } from '@/lib/scorecard/validate';

/** A score card saved in this browser. */
export interface CustomCard {
  slug: string;
  card: ScoreCard;
  createdAt: string;
  updatedAt: string;
  /** Slug in the shared library, once published. */
  publishedSlug?: string | null;
  /** Original rules text, kept so later AI edits have context. */
  rulesText?: string | null;
}

const listeners = new Set<() => void>();
let cache: CustomCard[] | null = null;
const EMPTY: CustomCard[] = [];

function read(): CustomCard[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CUSTOM_CARDS);
    const parsed = raw ? (JSON.parse(raw) as CustomCard[]) : [];
    // Drop anything that no longer validates rather than crashing later.
    cache = Array.isArray(parsed)
      ? parsed.filter((c) => c && typeof c.slug === 'string' && validateScoreCard(c.card).card)
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: CustomCard[]) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEYS.CUSTOM_CARDS, JSON.stringify(next));
  } catch (error) {
    console.error('Could not save score cards to this browser:', error);
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.CUSTOM_CARDS) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function makeCustomSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'game';
  return `custom-${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getCustomCard(slug: string): CustomCard | undefined {
  return read().find((c) => c.slug === slug);
}

export function useCustomCards() {
  const cards = useSyncExternalStore(subscribe, read, () => EMPTY);

  const saveCard = useCallback(
    (card: ScoreCard, options: { slug?: string; rulesText?: string | null; publishedSlug?: string | null } = {}) => {
      const now = new Date().toISOString();
      const current = read();
      const slug = options.slug ?? makeCustomSlug(card.name);
      const existing = current.find((c) => c.slug === slug);
      const entry: CustomCard = {
        slug,
        card,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        publishedSlug: options.publishedSlug ?? existing?.publishedSlug ?? null,
        rulesText: options.rulesText ?? existing?.rulesText ?? null,
      };
      write(existing ? current.map((c) => (c.slug === slug ? entry : c)) : [...current, entry]);
      return entry;
    },
    []
  );

  const removeCard = useCallback((slug: string) => {
    write(read().filter((c) => c.slug !== slug));
  }, []);

  return { cards, saveCard, removeCard };
}
