'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropzone } from './components/FileDropzone';
import { ProcessingStatus } from './components/ProcessingStatus';
import { useUploadPolling } from './hooks/useUploadPolling';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, FileText, Type } from 'lucide-react';
import { AIModel, getModelDisplayName } from '@/lib/ai/providers';

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';
type InputMethod = 'file' | 'text';

export function UploadGamePage() {
  const router = useRouter();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputMethod, setInputMethod] = useState<InputMethod>('text');
  const [rulesText, setRulesText] = useState<string>('');
  const [gameName, setGameName] = useState<string>('');
  const [aiModel, setAiModel] = useState<AIModel>('gpt-5.2');

  const { status, progress, gameSlug, needsCompletion, needsReview } = useUploadPolling(uploadId);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadState('idle');
    setErrorMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    console.log(`[Upload] Starting upload for file: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(2)} MB)`);
    setUploadState('uploading');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('aiModel', aiModel);

      console.log('[Upload] Sending file to server...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Upload] Upload failed:', error);
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('[Upload] Upload successful! Upload ID:', result.uploadId);
      console.log('[Upload] Background AI processing started.');
      setUploadId(result.uploadId);
      setUploadState('processing');
    } catch (error) {
      console.error('[Upload] Upload error:', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleTextSubmit = async () => {
    if (!rulesText.trim() || !gameName.trim()) {
      setErrorMessage('Please provide both game name and rules text');
      return;
    }

    console.log(`[Upload] Starting text upload for game: ${gameName}`);
    setUploadState('uploading');
    setErrorMessage(null);

    try {
      console.log('[Upload] Sending rules text to server...');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rulesText: rulesText.trim(),
          gameName: gameName.trim(),
          aiModel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[Upload] Text upload failed:', error);
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('[Upload] Text upload successful! Upload ID:', result.uploadId);
      console.log('[Upload] Background AI processing started.');
      setUploadId(result.uploadId);
      setUploadState('processing');
    } catch (error) {
      console.error('[Upload] Text upload error:', error);
      setUploadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  // Update state based on polling status
  useEffect(() => {
    if (uploadState === 'processing' && status) {
      if (status === 'awaiting_review' && gameSlug) {
        console.log('[Upload] 👀 Ready for review. Redirecting to review page...');
        router.push(`/games/${gameSlug}/review?uploadId=${uploadId}`);
      } else if (status === 'completed' && gameSlug) {
        if (needsCompletion) {
          console.log('[Upload] ⚠️  Game needs completion. Redirecting to completion page...');
          router.push(`/games/${gameSlug}/complete?uploadId=${uploadId}`);
        } else {
          console.log('[Upload] 🎉 Game successfully generated! Slug:', gameSlug);
          setUploadState('success');
        }
      } else if (status === 'failed') {
        console.error('[Upload] ❌ AI processing failed');
        setUploadState('error');
        setErrorMessage('AI processing failed. Please try again.');
      }
    }
  }, [uploadState, status, gameSlug, needsCompletion, uploadId, router]);

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
    setRulesText('');
    setGameName('');
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

      {/* Input Method Tabs */}
      {(uploadState === 'idle' || uploadState === 'uploading') && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              <button
                onClick={() => setInputMethod('text')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  inputMethod === 'text'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Type className="w-4 h-4 inline mr-2" />
                Paste Rules Text
              </button>
              <button
                onClick={() => setInputMethod('file')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  inputMethod === 'file'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Upload PDF
              </button>
            </div>
          </div>

          {/* Text Input */}
          {inputMethod === 'text' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="gameName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Game Name
                </label>
                <input
                  type="text"
                  id="gameName"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="e.g., Yahtzee, UNO, Phase 10"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploadState === 'uploading'}
                />
              </div>

              <div>
                <label htmlFor="rulesText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Game Rules
                </label>
                <textarea
                  id="rulesText"
                  value={rulesText}
                  onChange={(e) => setRulesText(e.target.value)}
                  placeholder="Paste the complete game rules here... Include setup, gameplay, scoring, and winning conditions."
                  rows={12}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-y"
                  disabled={uploadState === 'uploading'}
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {rulesText.length} characters • Paste the full rules from a website or document
                </p>
              </div>

              {/* AI Model Selector */}
              <div>
                <label htmlFor="aiModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  AI Model
                </label>
                <select
                  id="aiModel"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value as AIModel)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={uploadState === 'uploading'}
                >
                  <option value="gpt-5.2">{getModelDisplayName('gpt-5.2')}</option>
                  <option value="claude-sonnet-4.5">{getModelDisplayName('claude-sonnet-4.5')}</option>
                </select>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Choose which AI model to analyze your game rules
                </p>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleTextSubmit}
                  disabled={uploadState === 'uploading' || !rulesText.trim() || !gameName.trim()}
                  size="lg"
                >
                  {uploadState === 'uploading' ? 'Processing...' : 'Generate Game'}
                </Button>
              </div>
            </div>
          )}

          {/* File Upload */}
          {inputMethod === 'file' && (
            <div className="space-y-4">
              <FileDropzone
                onFileSelect={handleFileSelect}
                disabled={uploadState === 'uploading'}
                selectedFile={selectedFile}
              />

              {selectedFile && (
                <>
                  {/* AI Model Selector */}
                  <div>
                    <label htmlFor="aiModelFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      AI Model
                    </label>
                    <select
                      id="aiModelFile"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value as AIModel)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={uploadState === 'uploading'}
                    >
                      <option value="gpt-5.2">{getModelDisplayName('gpt-5.2')}</option>
                      <option value="claude-sonnet-4.5">{getModelDisplayName('claude-sonnet-4.5')}</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Choose which AI model to analyze your game rules
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <Button
                      onClick={handleUpload}
                      disabled={uploadState === 'uploading'}
                      size="lg"
                    >
                      {uploadState === 'uploading' ? 'Uploading...' : 'Upload & Process'}
                    </Button>
                  </div>
                </>
              )}
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
