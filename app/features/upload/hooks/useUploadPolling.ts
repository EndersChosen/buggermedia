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

const POLL_INTERVAL = 10000; // 10 seconds

export function useUploadPolling(uploadId: string | null): UseUploadPollingResult {
  const [status, setStatus] = useState<UploadStatus | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [gameSlug, setGameSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastStatusRef = useRef<UploadStatus | null>(null);

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
      startTimeRef.current = null;
      lastStatusRef.current = null;
      return;
    }

    // Start polling
    setIsPolling(true);
    startTimeRef.current = Date.now();
    console.log(`[Upload Polling] Started polling for upload ID: ${uploadId}`);

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/upload/status/${uploadId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }

        const data: UploadStatusResponse = await response.json();

        // Calculate elapsed time
        const elapsedMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
        const elapsedSec = Math.floor(elapsedMs / 1000);

        // Log status change
        if (data.status !== lastStatusRef.current) {
          const statusMessages: Record<UploadStatus, string> = {
            started: '📤 Upload initiated',
            pdf_parsed: '📄 PDF text extracted',
            ai_processing: '🤖 AI generating game definition...',
            completed: '✅ Game generation complete!',
            failed: '❌ Processing failed',
          };

          console.log(
            `[Upload Polling] ${statusMessages[data.status]} (${elapsedSec}s elapsed)`,
            data
          );
          lastStatusRef.current = data.status;
        }

        // Log progress updates for AI processing
        if (data.status === 'ai_processing' && data.progress) {
          console.log(
            `[Upload Polling] AI Progress: ${data.progress}% (${elapsedSec}s elapsed)`
          );
        }

        setStatus(data.status);
        setProgress(data.progress);
        setGameSlug(data.gameSlug || null);
        setError(data.error || null);

        // Log completion or failure details
        if (data.status === 'completed') {
          console.log(
            `[Upload Polling] ✅ Processing completed in ${elapsedSec}s`,
            `Game Slug: ${data.gameSlug}`
          );
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPolling(false);
        } else if (data.status === 'failed') {
          console.error(
            `[Upload Polling] ❌ Processing failed after ${elapsedSec}s`,
            `Error: ${data.error}`
          );
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsPolling(false);
        }
      } catch (err) {
        const elapsedMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
        const elapsedSec = Math.floor(elapsedMs / 1000);
        console.error(
          `[Upload Polling] 🚨 Polling error after ${elapsedSec}s:`,
          err
        );
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
