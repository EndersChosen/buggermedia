'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { ValidationIssue } from '@/lib/ai/game-validator';

interface CompleteGamePageProps {
  params: Promise<{ gameSlug: string }>;
  searchParams: Promise<{ uploadId?: string }>;
}

export default function CompleteGamePage({ params, searchParams }: CompleteGamePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const resolvedSearchParams = use(searchParams);
  const gameSlug = resolvedParams.gameSlug;
  const uploadId = resolvedSearchParams.uploadId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [corrections, setCorrections] = useState<Record<string, any>>({});
  const [gameName, setGameName] = useState('');

  useEffect(() => {
    if (!uploadId) {
      router.push('/');
      return;
    }

    async function fetchValidationIssues() {
      try {
        const response = await fetch(`/api/games/${gameSlug}/validate?uploadId=${uploadId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch validation issues');
        }

        const data = await response.json();
        setIssues(data.issues || []);
        setGameName(data.gameName || gameSlug);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching validation issues:', error);
        alert('Failed to load game data. Please try again.');
        router.push('/');
      }
    }

    fetchValidationIssues();
  }, [gameSlug, uploadId, router]);

  const handleChange = (field: string, value: any) => {
    setCorrections((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);

    try {
      const response = await fetch(`/api/games/${gameSlug}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          corrections,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save corrections');
      }

      const data = await response.json();
      alert('Game setup completed successfully!');
      router.push('/');
    } catch (error) {
      console.error('Error saving corrections:', error);
      alert('Failed to save corrections. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Complete Game Setup
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Our AI couldn't determine some information about <strong>{gameName}</strong>.
          Please provide the following details to complete the setup.
        </p>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Missing Information
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              We found {issues.length} item{issues.length !== 1 ? 's' : ''} that need your input.
              Fill in the information below and click "Save & Continue" to finish setting up your game.
            </p>
          </div>
        </div>
      </Card>

      {/* Questions */}
      <div className="space-y-4">
        {issues.map((issue, index) => (
          <Card key={issue.field}>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {index + 1}. {issue.question}
                </label>
                {issue.issue && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Issue: {issue.issue}
                  </p>
                )}
              </div>

              {issue.type === 'number' && (
                <Input
                  type="number"
                  value={corrections[issue.field] ?? issue.defaultValue ?? ''}
                  onChange={(e) => handleChange(issue.field, parseInt(e.target.value, 10))}
                  placeholder={`Enter ${issue.question.toLowerCase()}`}
                />
              )}

              {issue.type === 'text' && (
                <Input
                  type="text"
                  value={corrections[issue.field] ?? issue.defaultValue ?? ''}
                  onChange={(e) => handleChange(issue.field, e.target.value)}
                  placeholder={`Enter ${issue.question.toLowerCase()}`}
                />
              )}

              {issue.type === 'select' && issue.options && (
                <select
                  value={corrections[issue.field] ?? issue.defaultValue ?? ''}
                  onChange={(e) => handleChange(issue.field, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select an option...</option>
                  {issue.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="secondary"
          onClick={() => router.push('/')}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
