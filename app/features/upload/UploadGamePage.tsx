'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropzone } from './components/FileDropzone';
import { ProcessingStatus } from './components/ProcessingStatus';
import { useUploadPolling } from './hooks/useUploadPolling';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export function UploadGamePage() {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { status, progress, gameSlug } = useUploadPolling(uploadId);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadState('idle');
    setErrorMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState('uploading');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadId(result.uploadId);
      setUploadState('processing');
    } catch (error) {
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  // Update state based on polling status
  if (uploadState === 'processing' && status) {
    if (status === 'completed' && gameSlug) {
      setUploadState('success');
    } else if (status === 'failed') {
      setUploadState('error');
      setErrorMessage('AI processing failed. Please try again.');
    }
  }

  const handlePlayGame = () => {
    if (gameSlug) {
      router.push(`/game/${gameSlug}/new`);
    }
  };

  const handleReset = () => {
    setUploadState('idle');
    setUploadId(null);
    setErrorMessage(null);
    setSelectedFile(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Games
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Upload Game Rules
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Upload a PDF rulebook and our AI will generate a playable score card for your game
        </p>
      </div>

      {/* Upload Section */}
      {(uploadState === 'idle' || uploadState === 'uploading') && (
        <div className="space-y-6">
          <FileDropzone
            onFileSelect={handleFileSelect}
            disabled={uploadState === 'uploading'}
            selectedFile={selectedFile}
          />

          {selectedFile && (
            <div className="flex justify-center">
              <Button
                onClick={handleUpload}
                disabled={uploadState === 'uploading'}
                size="lg"
              >
                {uploadState === 'uploading' ? 'Uploading...' : 'Upload & Process'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Processing Status */}
      {uploadState === 'processing' && status && (
        <ProcessingStatus
          status={status}
          progress={progress || 0}
          errorMessage={errorMessage}
        />
      )}

      {/* Success State */}
      {uploadState === 'success' && gameSlug && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-8 text-center space-y-4">
          <div className="text-green-600 dark:text-green-400 text-5xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Game Ready!
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Your game has been successfully processed and is ready to play
          </p>
          <div className="flex gap-3 justify-center pt-4">
            <Button onClick={handlePlayGame} size="lg">
              Start Playing
            </Button>
            <Button variant="secondary" onClick={handleReset} size="lg">
              Upload Another
            </Button>
          </div>
        </div>
      )}

      {/* Error State */}
      {uploadState === 'error' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8 text-center space-y-4">
          <div className="text-red-600 dark:text-red-400 text-5xl mb-4">✗</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Upload Failed
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {errorMessage || 'An error occurred while processing your file'}
          </p>
          <Button variant="secondary" onClick={handleReset} size="lg">
            Try Again
          </Button>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          How it works:
        </h3>
        <ol className="space-y-2 text-gray-600 dark:text-gray-300 list-decimal list-inside">
          <li>Upload a PDF rulebook for any card game</li>
          <li>Our AI analyzes the rules and generates a custom score card</li>
          <li>The game becomes available for anyone to play</li>
          <li>Start tracking scores immediately</li>
        </ol>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          Maximum file size: 10MB • Processing time: ~30-60 seconds
        </p>
      </div>
    </div>
  );
}
