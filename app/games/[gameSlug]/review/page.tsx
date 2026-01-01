'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface ReviewGamePageProps {
  params: Promise<{ gameSlug: string }>;
}

interface ParsedGame {
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  teams?: {
    enabled: boolean;
    size: number;
    count: number;
    scoringUnit: string;
  };
  rounds: {
    type: string;
    maxRounds?: number;
    fields: Array<{
      id: string;
      label: string;
      type: string;
      perPlayer?: boolean;
      perTeam?: boolean;
    }>;
  };
  scoring: {
    formulas: Array<{
      name: string;
      description?: string;
    }>;
  };
  winCondition: {
    type: string;
    description: string;
    targetScore?: number;
  };
}

export default function ReviewGamePage({ params }: ReviewGamePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const gameSlug = resolvedParams.gameSlug;
  const uploadId = searchParams.get('uploadId');

  const [parsedGame, setParsedGame] = useState<ParsedGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [refining, setRefining] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    async function loadParsedGame() {
      try {
        const response = await fetch(`/api/games/${gameSlug}/review?uploadId=${uploadId}`);
        if (!response.ok) {
          throw new Error('Failed to load game definition');
        }
        const data = await response.json();
        setParsedGame(data.definition);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    }

    if (gameSlug && uploadId) {
      loadParsedGame();
    }
  }, [gameSlug, uploadId]);

  const handleApprove = async () => {
    setApproving(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameSlug}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve game');
      }

      // Redirect to home on success
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve game');
    } finally {
      setApproving(false);
    }
  };

  const handleRefine = async () => {
    if (!feedback.trim()) {
      setError('Please provide feedback about what needs to be changed');
      return;
    }

    setRefining(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameSlug}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, feedback: feedback.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refine game');
      }

      const data = await response.json();
      setParsedGame(data.definition);
      setFeedback('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine game');
    } finally {
      setRefining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading parsed game...</p>
        </div>
      </div>
    );
  }

  if (error && !parsedGame) {
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
          Back to Home
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Review Parsed Game: {parsedGame?.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Review the AI-parsed game definition and provide feedback if anything needs correction
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Parsed Game Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Parsed Game Definition</h2>

        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Basic Information</h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 space-y-2">
            <p><span className="font-medium">Name:</span> {parsedGame?.name}</p>
            <p><span className="font-medium">Description:</span> {parsedGame?.description}</p>
            <p><span className="font-medium">Players:</span> {parsedGame?.minPlayers}-{parsedGame?.maxPlayers}</p>
          </div>
        </div>

        {/* Teams */}
        {parsedGame?.teams?.enabled && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Teams/Partnerships</h3>
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 space-y-2">
              <p><span className="font-medium">Teams Enabled:</span> Yes</p>
              <p><span className="font-medium">Team Size:</span> {parsedGame.teams.size} players per team</p>
              <p><span className="font-medium">Number of Teams:</span> {parsedGame.teams.count}</p>
              <p><span className="font-medium">Scoring Unit:</span> {parsedGame.teams.scoringUnit === 'team' ? 'Team (combined)' : 'Individual'}</p>
            </div>
          </div>
        )}

        {/* Rounds */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Round Structure</h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 space-y-2">
            <p><span className="font-medium">Type:</span> {parsedGame?.rounds.type}</p>
            {parsedGame?.rounds.maxRounds && (
              <p><span className="font-medium">Number of Rounds:</span> {parsedGame.rounds.maxRounds}</p>
            )}
            <div className="mt-2">
              <p className="font-medium mb-1">Fields tracked per round:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {parsedGame?.rounds.fields.map((field) => (
                  <li key={field.id}>
                    {field.label} ({field.type})
                    {field.perPlayer && ' - per player'}
                    {field.perTeam && ' - per team'}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Scoring</h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 space-y-2">
            <ul className="list-disc list-inside space-y-1">
              {parsedGame?.scoring.formulas.map((formula, idx) => (
                <li key={idx}>
                  <span className="font-medium">{formula.name}:</span> {formula.description || 'Score calculation'}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Win Condition */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Win Condition</h3>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 space-y-2">
            <p><span className="font-medium">Type:</span> {parsedGame?.winCondition.type}</p>
            {parsedGame?.winCondition.targetScore && (
              <p><span className="font-medium">Target Score:</span> {parsedGame.winCondition.targetScore}</p>
            )}
            <p>{parsedGame?.winCondition.description}</p>
          </div>
        </div>
      </div>

      {/* Feedback Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Need corrections?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            If something isn't quite right, describe what needs to be changed in natural language. For example:
            "The game is played in teams of 2, and each player's tricks are combined for the round"
          </p>
        </div>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Describe any corrections needed (optional)..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={refining}
        />

        <div className="flex gap-3">
          <Button
            onClick={handleRefine}
            disabled={refining || !feedback.trim()}
            variant="secondary"
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {refining ? 'Refining...' : 'Refine with Feedback'}
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={() => router.push('/')}>
          Cancel
        </Button>
        <Button onClick={handleApprove} disabled={approving}>
          <CheckCircle className="w-4 h-4 mr-2" />
          {approving ? 'Approving...' : 'Looks Good - Save Game'}
        </Button>
      </div>
    </div>
  );
}
