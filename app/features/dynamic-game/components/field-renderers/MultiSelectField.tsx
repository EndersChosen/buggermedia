'use client';

interface MultiSelectFieldProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
  validation?: {
    required?: boolean;
  };
  helperText?: string;
  error?: string;
  disabled?: boolean;
}

export function MultiSelectField({
  label,
  value,
  onChange,
  options,
  validation,
  helperText,
  error,
  disabled = false,
}: MultiSelectFieldProps) {
  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {validation?.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="space-y-2 p-3 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
          >
            <input
              type="checkbox"
              checked={value.includes(option)}
              onChange={() => toggleOption(option)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2 disabled:opacity-50"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {option}
            </span>
          </label>
        ))}
      </div>

      {helperText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
