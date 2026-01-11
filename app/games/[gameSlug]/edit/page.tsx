'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ArrowLeft, Save, AlertCircle, Upload, RefreshCw } from 'lucide-react';
import type { DynamicGameDefinition } from '@/lib/types/dynamic-game.types';
import { AIModel, getModelDisplayName } from '@/lib/ai/providers';

interface EditGamePageProps {
  params: Promise<{ gameSlug: string }>;
}

interface GameData {
  metadata: {
    id: string;
    name: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
  };
  definition: DynamicGameDefinition;
}

type EditSection = 'metadata' | 'rounds' | 'scoring' | 'winCondition' | 'replaceRules';
type ReplaceInputMethod = 'file' | 'text';

export default function EditGamePage({ params }: EditGamePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const gameSlug = resolvedParams.gameSlug;

  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<EditSection>('metadata');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(6);

  // Replace rules state
  const [replaceInputMethod, setReplaceInputMethod] = useState<ReplaceInputMethod>('text');
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceText, setReplaceText] = useState('');
  const [replaceName, setReplaceName] = useState('');
  const [replaceAiModel, setReplaceAiModel] = useState<AIModel>('gpt-5.2');
  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    async function loadGame() {
      try {
        const response = await fetch(`/api/games/${gameSlug}/definition`);
        if (!response.ok) {
          throw new Error('Failed to load game');
        }
        const data: GameData = await response.json();
        setGameData(data);

        // Initialize form fields
        setName(data.metadata.name);
        setDescription(data.metadata.description);
        setMinPlayers(data.metadata.minPlayers);
        setMaxPlayers(data.metadata.maxPlayers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    }

    loadGame();
  }, [gameSlug]);

  const handleSave = async () => {
    if (!gameData) return;

    setSaving(true);
    setError(null);

    try {
      const updates: any = {};

      // Only include changed metadata
      if (
        name !== gameData.metadata.name ||
        description !== gameData.metadata.description ||
        minPlayers !== gameData.metadata.minPlayers ||
        maxPlayers !== gameData.metadata.maxPlayers
      ) {
        updates.metadata = {
          name,
          description,
          minPlayers,
          maxPlayers,
        };
      }

      // If no changes, don't make the request
      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        setSaving(false);
        return;
      }

      const response = await fetch(`/api/games/${gameSlug}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save changes');
      }

      // Redirect back to home on success
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceRules = async () => {
    if (replaceInputMethod === 'file' && !replaceFile) {
      setError('Please select a file to upload');
      return;
    }
    if (replaceInputMethod === 'text' && (!replaceText.trim() || !replaceName.trim())) {
      setError('Please provide both game name and rules text');
      return;
    }

    if (!confirm('This will completely replace the game definition with newly generated rules. This cannot be undone. Continue?')) {
      return;
    }

    setReplacing(true);
    setError(null);

    try {
      let response;

      if (replaceInputMethod === 'file') {
        const formData = new FormData();
        formData.append('file', replaceFile!);
        formData.append('gameSlug', gameSlug);
        formData.append('aiModel', replaceAiModel);

        response = await fetch('/api/games/replace-rules', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/games/replace-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameSlug,
            rulesText: replaceText.trim(),
            gameName: replaceName.trim(),
            aiModel: replaceAiModel,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to replace rules');
      }

      const result = await response.json();

      // Show success and redirect
      alert(`Game rules have been successfully regenerated! The game will reload.`);
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to replace rules');
    } finally {
      setReplacing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error && !gameData) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Error Loading Game</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <Button onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="secondary" size="sm" onClick={() => router.push('/')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Games
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Edit Game: {gameData?.metadata.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Update the game definition and metadata
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Section Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveSection('metadata')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'metadata'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveSection('rounds')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'rounds'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Rounds
          </button>
          <button
            onClick={() => setActiveSection('scoring')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'scoring'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Scoring
          </button>
          <button
            onClick={() => setActiveSection('winCondition')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'winCondition'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Win Condition
          </button>
          <button
            onClick={() => setActiveSection('replaceRules')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSection === 'replaceRules'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            <RefreshCw className="w-4 h-4 inline mr-1" />
            Replace Rules
          </button>
        </div>
      </div>

      {/* Section Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {activeSection === 'metadata' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Game Name *
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Skull King"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the game..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="minPlayers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Players *
                </label>
                <Input
                  id="minPlayers"
                  type="number"
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(parseInt(e.target.value) || 1)}
                  min={1}
                  max={maxPlayers}
                />
              </div>

              <div>
                <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Players *
                </label>
                <Input
                  id="maxPlayers"
                  type="number"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 2)}
                  min={minPlayers}
                  max={20}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'rounds' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Round Configuration
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-200">
                Advanced editing of round structure is not yet available. This feature will allow you to modify round types, fields, and validation rules.
              </p>
            </div>
          </div>
        )}

        {activeSection === 'scoring' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Scoring Formulas
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-200">
                Advanced editing of scoring formulas is not yet available. This feature will allow you to modify scoring expressions and calculations.
              </p>
            </div>
          </div>
        )}

        {activeSection === 'winCondition' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Win Condition
            </h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-blue-800 dark:text-blue-200">
                Advanced editing of win conditions is not yet available. This feature will allow you to modify how winners are determined.
              </p>
            </div>
          </div>
        )}

        {activeSection === 'replaceRules' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Replace Game Rules
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload new rules to completely regenerate the game definition using AI
              </p>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-semibold mb-1">Warning: This action cannot be undone</p>
                  <p>
                    Replacing the rules will regenerate the entire game definition from scratch using AI.
                    All current round structures, scoring formulas, and validation rules will be replaced.
                  </p>
                </div>
              </div>
            </div>

            {/* Input Method Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-4">
                <button
                  onClick={() => setReplaceInputMethod('text')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    replaceInputMethod === 'text'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  Paste Rules Text
                </button>
                <button
                  onClick={() => setReplaceInputMethod('file')}
                  className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    replaceInputMethod === 'file'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                  }`}
                >
                  Upload PDF
                </button>
              </div>
            </div>

            {/* Text Input */}
            {replaceInputMethod === 'text' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="replaceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Game Name
                  </label>
                  <Input
                    id="replaceName"
                    type="text"
                    value={replaceName}
                    onChange={(e) => setReplaceName(e.target.value)}
                    placeholder="e.g., Yahtzee, UNO, Phase 10"
                    disabled={replacing}
                  />
                </div>

                <div>
                  <label htmlFor="replaceText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Game Rules
                  </label>
                  <textarea
                    id="replaceText"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="Paste the complete game rules here... Include setup, gameplay, scoring, and winning conditions."
                    rows={12}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-y"
                    disabled={replacing}
                  />
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {replaceText.length} characters
                  </p>
                </div>

                <div>
                  <label htmlFor="replaceAiModel" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AI Model
                  </label>
                  <select
                    id="replaceAiModel"
                    value={replaceAiModel}
                    onChange={(e) => setReplaceAiModel(e.target.value as AIModel)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={replacing}
                  >
                    <option value="gpt-5.2">{getModelDisplayName('gpt-5.2')}</option>
                    <option value="claude-sonnet-4.5">{getModelDisplayName('claude-sonnet-4.5')}</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Choose which AI model to analyze your game rules
                  </p>
                </div>

                <Button
                  onClick={handleReplaceRules}
                  disabled={replacing || !replaceText.trim() || !replaceName.trim()}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {replacing ? 'Regenerating...' : 'Regenerate Game from Text'}
                </Button>
              </div>
            )}

            {/* File Upload */}
            {replaceInputMethod === 'file' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload PDF Rulebook
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="replace-file-input"
                      disabled={replacing}
                    />
                    <label
                      htmlFor="replace-file-input"
                      className="cursor-pointer inline-flex flex-col items-center"
                    >
                      <Upload className="w-12 h-12 text-gray-400 mb-3" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {replaceFile ? replaceFile.name : 'Click to upload PDF'}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Maximum file size: 10MB
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="replaceAiModelFile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AI Model
                  </label>
                  <select
                    id="replaceAiModelFile"
                    value={replaceAiModel}
                    onChange={(e) => setReplaceAiModel(e.target.value as AIModel)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={replacing}
                  >
                    <option value="gpt-5.2">{getModelDisplayName('gpt-5.2')}</option>
                    <option value="claude-sonnet-4.5">{getModelDisplayName('claude-sonnet-4.5')}</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Choose which AI model to analyze your game rules
                  </p>
                </div>

                {replaceFile && (
                  <Button
                    onClick={handleReplaceRules}
                    disabled={replacing}
                    className="w-full"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {replacing ? 'Regenerating...' : 'Regenerate Game from PDF'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={() => router.push('/')}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Info Note */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> Currently, only basic metadata (name, description, player counts) can be edited. Advanced editing of rounds, scoring, and win conditions will be available in a future update.
        </p>
      </div>
    </div>
  );
}
