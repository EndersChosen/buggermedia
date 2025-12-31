'use client';

import { useEffect, useState, useRef } from 'react';

type UploadStatus = 'started' | 'pdf_parsed' | 'ai_processing' | 'completed' | 'failed';

interface UploadStatusResponse {
  status: UploadStatus;
  progress: number;
  gameSlug?: string | null;
  error?: string;
}

interface UseUploadPollingResult {
  status: UploadStatus | null;
  progress: number | null;
  gameSlug: string | null;
  error: string | null;
  isPolling: boolean;
}

const POLL_INTERVAL = 2000; // 2 seconds

export function useUploadPolling(uploadId: string | null): UseUploadPollingResult {
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [gameSlug, setGameSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous polling if uploadId changes
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset state when uploadId changes
    if (!uploadId) {
      setStatus(null);
      setProgress(null);
      setGameSlug(null);
      setError(null);
      setIsPolling(false);
      return;
    }

    // Start polling
    setIsPolling(true);

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/upload/status/${uploadId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }

        const data: UploadStatusResponse = await response.json();

        setStatus(data.status);
        setProgress(data.progress);
        setGameSlug(data.gameSlug || null);
        setError(data.error || null);

        // Stop polling if completed or failed
        if (data.status === 'completed' || data.status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPolling(false);
        }
      } catch (err) {
        console.error('Polling error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPolling(false);
      }
    };

    // Poll immediately
    pollStatus();

    // Set up interval for subsequent polls
    intervalRef.current = setInterval(pollStatus, POLL_INTERVAL);

    // Cleanup on unmount or uploadId change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [uploadId]);

  return {
    status,
    progress,
    gameSlug,
    error,
    isPolling,
  };
}
