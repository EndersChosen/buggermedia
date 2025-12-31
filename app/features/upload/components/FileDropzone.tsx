'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  selectedFile?: File | null;
}

export function FileDropzone({ onFileSelect, disabled, selectedFile }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are accepted';
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClear = () => {
    setError(null);
    onFileSelect(null as any);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center
          transition-all duration-200
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileInput}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <Upload
              className={`w-16 h-16 ${
                isDragging
                  ? 'text-blue-500'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
          </div>

          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {isDragging ? 'Drop your PDF here' : 'Upload Game Rulebook'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Drag and drop a PDF file here, or click to browse
            </p>
          </div>

          <div className="text-xs text-gray-400 dark:text-gray-500">
            PDF only • Maximum 10MB
          </div>
        </div>
      </div>

      {/* Selected File Display */}
      {selectedFile && !error && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            {!disabled && (
              <button
                onClick={handleClear}
                className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
