'use client';

interface BooleanFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  helperText?: string;
  disabled?: boolean;
}

export function BooleanField({
  label,
  value,
  onChange,
  helperText,
  disabled = false,
}: BooleanFieldProps) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2 disabled:opacity-50"
        />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      </label>

      {helperText && (
        <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">{helperText}</p>
      )}
    </div>
  );
}
