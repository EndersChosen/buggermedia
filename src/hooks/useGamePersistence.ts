import { useEffect, useRef, useCallback } from 'react';
import { GameSession, STORAGE_KEYS } from '@/@types/game.types';
import { useLocalStorage } from './useLocalStorage';

const DEBOUNCE_DELAY = 500; // 500ms debounce

/**
 * Hook for managing game persistence with auto-save debouncing
 */
export function useGamePersistence() {
  const [activeGames, setActiveGames] = useLocalStorage<GameSession[]>(
    STORAGE_KEYS.ACTIVE_GAMES,
    []
  );
  const [completedGames, setCompletedGames] = useLocalStorage<GameSession[]>(
    STORAGE_KEYS.COMPLETED_GAMES,
    []
  );

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced save function
  const debouncedSave = useCallback(
    (games: GameSession[], isActive: boolean) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        if (isActive) {
          setActiveGames(games);
        } else {
          setCompletedGames(games);
        }
      }, DEBOUNCE_DELAY);
    },
    [setActiveGames, setCompletedGames]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Immediate save (bypasses debounce) for critical operations
  const saveImmediately = useCallback(
    (games: GameSession[], isActive: boolean) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      if (isActive) {
        setActiveGames(games);
      } else {
        setCompletedGames(games);
      }
    },
    [setActiveGames, setCompletedGames]
  );

  // Clean up old completed games (older than 30 days)
  const cleanupOldGames = useCallback(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    setCompletedGames((prev) =>
      prev.filter((game) => new Date(game.lastModified) > thirtyDaysAgo)
    );
  }, [setCompletedGames]);

  // Export all data as JSON
  const exportData = useCallback(() => {
    const data = {
      activeGames,
      completedGames,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `cardgames-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [activeGames, completedGames]);

  // Import data from JSON
  const importData = useCallback(
    (jsonData: string) => {
      try {
        const data = JSON.parse(jsonData);

        if (data.activeGames && Array.isArray(data.activeGames)) {
          setActiveGames(data.activeGames);
        }

        if (data.completedGames && Array.isArray(data.completedGames)) {
          setCompletedGames(data.completedGames);
        }

        return { success: true };
      } catch (error) {
        console.error('Error importing data:', error);
        return { success: false, error };
      }
    },
    [setActiveGames, setCompletedGames]
  );

  return {
    activeGames,
    completedGames,
    debouncedSave,
    saveImmediately,
    cleanupOldGames,
    exportData,
    importData,
  };
}
