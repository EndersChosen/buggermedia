'use client';

import { FileText, Brain, CheckCircle2, AlertCircle } from 'lucide-react';

type ProcessingStage =
  | 'started'
  | 'pdf_parsed'
  | 'ai_processing'
  | 'awaiting_review'
  | 'completed'
  | 'failed';

interface ProcessingStatusProps {
  status: ProcessingStage;
  progress: number;
  errorMessage?: string | null;
}

interface StageInfo {
  label: string;
  icon: React.ReactNode;
  description: string;
}

const STAGES: Record<ProcessingStage, StageInfo> = {
  started: {
    label: 'Uploading',
    icon: <FileText className="w-6 h-6" />,
    description: 'Uploading your PDF to the server...',
  },
  pdf_parsed: {
    label: 'Parsing PDF',
    icon: <FileText className="w-6 h-6" />,
    description: 'Extracting text from the rulebook...',
  },
  ai_processing: {
    label: 'AI Processing',
    icon: <Brain className="w-6 h-6" />,
    description: 'Our AI is analyzing the rules and generating the game...',
  },
  awaiting_review: {
    label: 'Ready for Review',
    icon: <CheckCircle2 className="w-6 h-6" />,
    description: 'AI processing complete! Redirecting to review page...',
  },
  completed: {
    label: 'Complete',
    icon: <CheckCircle2 className="w-6 h-6" />,
    description: 'Processing complete!',
  },
  failed: {
    label: 'Failed',
    icon: <AlertCircle className="w-6 h-6" />,
    description: 'Processing failed',
  },
};

export function ProcessingStatus({ status, progress, errorMessage }: ProcessingStatusProps) {
  const currentStage = STAGES[status];
  const isError = status === 'failed';
  const isComplete = status === 'completed' || status === 'awaiting_review';

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 space-y-6">
      {/* Current Stage Icon */}
      <div className="flex justify-center">
        <div
          className={`
            rounded-full p-6
            ${isError ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400' : ''}
            ${isComplete ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : ''}
            ${!isError && !isComplete ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''}
          `}
        >
          {currentStage.icon}
        </div>
      </div>

      {/* Stage Label */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {currentStage.label}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {errorMessage || currentStage.description}
        </p>
      </div>

      {/* Progress Bar */}
      {!isError && !isComplete && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            {progress}% complete
          </p>
        </div>
      )}

      {/* Processing Steps */}
      {!isError && (
        <div className="pt-4 space-y-3">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Processing Steps:
          </div>
          <div className="space-y-2">
            {Object.entries(STAGES)
              .filter(([key]) => key !== 'failed' && key !== 'completed')
              .map(([key, stage]) => {
                const progressMap: Record<string, number> = {
                  started: 10,
                  pdf_parsed: 30,
                  ai_processing: 60,
                  awaiting_review: 90,
                };

                const stageProgress = progressMap[key];
                const isCurrentStage = status === key;
                const isPastStage = progress > stageProgress;

                return (
                  <div key={key} className="flex items-center gap-3">
                    <div
                      className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center
                        ${isPastStage ? 'bg-green-500 border-green-500' : ''}
                        ${isCurrentStage ? 'border-blue-500 animate-pulse' : ''}
                        ${!isPastStage && !isCurrentStage ? 'border-gray-300 dark:border-gray-600' : ''}
                      `}
                    >
                      {isPastStage && (
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      )}
                      {isCurrentStage && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <span
                      className={`
                        text-sm
                        ${isPastStage || isCurrentStage ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}
                      `}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Estimated Time */}
      {!isError && !isComplete && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
          This usually takes 30-60 seconds
        </div>
      )}
    </div>
  );
}
