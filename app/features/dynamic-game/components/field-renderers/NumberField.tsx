'use client';

import { Input } from '@/components/ui/Input';

interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  validation?: {
    min?: number;
    max?: number;
    required?: boolean;
  };
  helperText?: string;
  error?: string;
  disabled?: boolean;
}

export function NumberField({
  label,
  value,
  onChange,
  validation,
  helperText,
  error,
  disabled = false,
}: NumberFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (inputValue === '') {
      onChange(null);
      return;
    }

    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {validation?.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <Input
        type="number"
        value={value ?? ''}
        onChange={handleChange}
        min={validation?.min}
        max={validation?.max}
        disabled={disabled}
        className={error ? 'border-red-500' : ''}
      />

      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
