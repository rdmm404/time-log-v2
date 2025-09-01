import React, { useState } from 'react';

interface DropdownOption<T = string | number> {
  value: T;
  label: string;
}

interface CustomDropdownProps<T = string | number> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function CustomDropdown<T = string | number>({
  value,
  onChange,
  options,
  label,
  placeholder = "Select...",
  className = "",
  disabled = false
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;

  const handleSelect = (optionValue: T) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text mb-2">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          w-full px-3 py-2 bg-foreground/20 border border-foreground/30 rounded-lg text-text text-left
          focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
          transition-colors duration-200 flex items-center justify-between
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-foreground/50'}
        `}
      >
        <span className={selectedOption ? '' : 'text-text/50'}>{displayValue}</span>
        <svg 
          className={`w-4 h-4 text-text/50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border border-foreground/20 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                w-full px-3 py-2 text-left hover:bg-foreground/10
                ${value === option.value ? 'bg-foreground/20' : ''}
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default CustomDropdown;