'use client';

import { useState, useEffect } from 'react';
import type { DynamicGameDefinition, DynamicRoundData } from '@/lib/types/dynamic-game.types';
import { NumberField, BooleanField, SelectField, MultiSelectField } from './field-renderers';
import { validateRoundData } from '@/lib/engines/validation';
import { calculateRoundScores } from '@/lib/engines/scoring';
import { Button } from '@/components/ui/Button';

interface DynamicScoreInputProps {
  definition: DynamicGameDefinition;
  players: Array<{ id: string; name: string }>;
  currentRound: number;
  totalScores: Record<string, number>;
  onSubmit: (roundData: DynamicRoundData) => void;
  onCancel?: () => void;
}

export function DynamicScoreInput({
  definition,
  players,
  currentRound,
  totalScores,
  onSubmit,
  onCancel,
}: DynamicScoreInputProps) {
  const [roundData, setRoundData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewScores, setPreviewScores] = useState<Record<string, number>>({});

  // Initialize default values
  useEffect(() => {
    const initialData: Record<string, any> = {};

    definition.rounds.fields.forEach((field) => {
      if (field.perPlayer) {
        // Per-player field
        players.forEach((player) => {
          const fieldKey = `${field.id}_${player.id}`;
          initialData[fieldKey] = field.defaultValue ?? getDefaultValue(field.type);
        });
      } else {
        // Global field
        initialData[field.id] = field.defaultValue ?? getDefaultValue(field.type);
      }
    });

    setRoundData(initialData);
  }, [definition, players]);

  // Calculate preview scores when round data changes
  useEffect(() => {
    try {
      const result = calculateRoundScores(definition, {
        currentRound: currentRound,
        playerIds: players.map((p) => p.id),
        roundData: roundData,
        totalScores,
        allRounds: [],
      });

      setPreviewScores(result.scores);
    } catch (error) {
      console.error('Score calculation error:', error);
      setPreviewScores({});
    }
  }, [roundData, definition, currentRound, players, totalScores]);

  const getDefaultValue = (type: string) => {
    switch (type) {
      case 'number':
        return null;
      case 'boolean':
        return false;
      case 'select':
        return null;
      case 'multi-select':
        return [];
      case 'text':
        return '';
      default:
        return null;
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setRoundData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Clear error for this field
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  };

  const handleSubmit = () => {
    // Validate round data
    const validation = validateRoundData(definition, roundData, {
      currentRound: currentRound,
      playerIds: players.map((p) => p.id),
      roundData: roundData,
      totalScores,
      allRounds: [],
    });

    if (!validation.isValid) {
      // Map validation errors to field errors
      const fieldErrors: Record<string, string> = {};
      validation.errors.forEach((error) => {
        if (error.severity === 'error') {
          fieldErrors[error.field] = error.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // Submit the round
    onSubmit({
      roundNumber: currentRound,
      fields: roundData,
      roundScores: previewScores,
      timestamp: new Date().toISOString(),
    });
  };

  const renderField = (field: any, playerId?: string) => {
    const fieldKey = playerId ? `${field.id}_${playerId}` : field.id;
    const value = roundData[fieldKey];
    const error = errors[fieldKey];

    const commonProps = {
      label: playerId ? `${field.label} (${players.find((p) => p.id === playerId)?.name})` : field.label,
      helperText: field.helperText,
      error,
      disabled: false,
    };

    switch (field.type) {
      case 'number':
        return (
          <NumberField
            key={fieldKey}
            {...commonProps}
            value={value}
            onChange={(v) => handleFieldChange(fieldKey, v)}
            validation={field.validation}
          />
        );

      case 'boolean':
        return (
          <BooleanField
            key={fieldKey}
            {...commonProps}
            value={value}
            onChange={(v) => handleFieldChange(fieldKey, v)}
          />
        );

      case 'select':
        return (
          <SelectField
            key={fieldKey}
            {...commonProps}
            value={value}
            onChange={(v) => handleFieldChange(fieldKey, v)}
            options={field.options || []}
            validation={field.validation}
          />
        );

      case 'multi-select':
        return (
          <MultiSelectField
            key={fieldKey}
            {...commonProps}
            value={value}
            onChange={(v) => handleFieldChange(fieldKey, v)}
            options={field.options || []}
            validation={field.validation}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Round Header */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Round {currentRound}
        </h3>
        {definition.rounds.type === 'variable' && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Enter scores for this round
          </p>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-6">
        {definition.rounds.fields.map((field) => {
          if (field.perPlayer) {
            // Render one field per player
            return (
              <div key={field.id} className="space-y-4">
                <h4 className="font-medium text-gray-900 dark:text-white">{field.label}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {players.map((player) => renderField(field, player.id))}
                </div>
              </div>
            );
          } else {
            // Single global field
            return <div key={field.id}>{renderField(field)}</div>;
          }
        })}
      </div>

      {/* Preview Scores */}
      {Object.keys(previewScores).length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Round Score Preview</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {players.map((player) => (
              <div key={player.id} className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">{player.name}</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {previewScores[player.id] ?? 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Total: {(totalScores[player.id] ?? 0) + (previewScores[player.id] ?? 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSubmit}>
          Submit Round
        </Button>
      </div>
    </div>
  );
}
