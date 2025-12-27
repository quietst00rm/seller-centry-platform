'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// EDITABLE TEXT CELL
// ============================================

interface EditableTextCellProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function EditableTextCell({
  value,
  onSave,
  placeholder = 'Click to edit',
  maxLength = 500,
  className,
}: EditableTextCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setEditValue(value); // Revert on error
    } finally {
      setIsSaving(false);
    }
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value);
    setIsEditing(false);
    setError(null);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          maxLength={maxLength}
          disabled={isSaving}
          className={cn(
            'w-full px-2 py-1 text-sm bg-[#222] border rounded',
            error ? 'border-red-500' : 'border-orange-500',
            'text-white focus:outline-none focus:ring-1 focus:ring-orange-500',
            isSaving && 'opacity-50',
            className
          )}
        />
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-orange-500" />}
      </div>
    );
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className={cn(
        'px-1 py-0.5 rounded cursor-pointer transition-colors',
        'hover:bg-gray-700/50 group',
        error && 'bg-red-500/10',
        className
      )}
      title="Click to edit"
    >
      <span className={cn('text-sm', !value && 'text-gray-500 italic')}>
        {value || placeholder}
      </span>
    </div>
  );
}

// ============================================
// EDITABLE SELECT CELL (Status, Impact)
// ============================================

interface EditableSelectCellProps<T extends string> {
  value: T;
  options: T[];
  onSave: (value: T) => Promise<void>;
  renderOption?: (option: T) => React.ReactNode;
  renderValue?: (value: T) => React.ReactNode;
  className?: string;
}

export function EditableSelectCell<T extends string>({
  value,
  options,
  onSave,
  renderOption,
  renderValue,
  className,
}: EditableSelectCellProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = async (newValue: T) => {
    if (newValue === value) {
      setIsOpen(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(newValue);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={isSaving}
        className={cn(
          'flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer transition-colors',
          'hover:bg-gray-700/50',
          error && 'bg-red-500/10',
          isSaving && 'opacity-50',
          className
        )}
      >
        {renderValue ? renderValue(value) : <span className="text-sm">{value}</span>}
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
        ) : (
          <ChevronDown className="h-3 w-3 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-[150px] bg-[#1a1a1a] border border-gray-700 rounded-md shadow-lg overflow-hidden">
          {options.map((option) => (
            <button
              key={option}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(option);
              }}
              className={cn(
                'w-full px-3 py-2 text-left text-sm transition-colors',
                'hover:bg-gray-700/50',
                option === value && 'bg-orange-500/20'
              )}
            >
              {renderOption ? renderOption(option) : option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// EDITABLE MULTI-SELECT CELL (Docs Needed)
// ============================================

interface EditableMultiSelectCellProps {
  value: string; // Comma-separated values
  options: string[];
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

export function EditableMultiSelectCell({
  value,
  options,
  onSave,
  placeholder = 'None',
  className,
}: EditableMultiSelectCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  useEffect(() => {
    const values = value
      ? value.split(',').map((v) => v.trim()).filter(Boolean)
      : [];
    setSelectedValues(new Set(values));
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, selectedValues]);

  const handleToggle = (option: string) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(option)) {
      newSelected.delete(option);
    } else {
      newSelected.add(option);
    }
    setSelectedValues(newSelected);
  };

  const handleSave = async () => {
    const newValue = Array.from(selectedValues).join(', ');
    if (newValue === value) {
      setIsOpen(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(newValue);
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      // Revert on error
      const values = value
        ? value.split(',').map((v) => v.trim()).filter(Boolean)
        : [];
      setSelectedValues(new Set(values));
    } finally {
      setIsSaving(false);
    }
  };

  const displayValue = selectedValues.size > 0
    ? Array.from(selectedValues).join(', ')
    : placeholder;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={isSaving}
        className={cn(
          'flex items-center gap-1 px-1 py-0.5 rounded cursor-pointer transition-colors',
          'hover:bg-gray-700/50',
          error && 'bg-red-500/10',
          isSaving && 'opacity-50',
          className
        )}
      >
        <span className={cn('text-sm', selectedValues.size === 0 && 'text-gray-500')}>
          {displayValue}
        </span>
        {isSaving ? (
          <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
        ) : (
          <ChevronDown className="h-3 w-3 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 min-w-[180px] bg-[#1a1a1a] border border-gray-700 rounded-md shadow-lg overflow-hidden">
          {options.map((option) => (
            <label
              key={option}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors',
                'hover:bg-gray-700/50'
              )}
            >
              <input
                type="checkbox"
                checked={selectedValues.has(option)}
                onChange={() => handleToggle(option)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500 focus:ring-offset-0"
              />
              <span className="text-sm text-white">{option}</span>
            </label>
          ))}
          <div className="flex justify-end gap-2 px-3 py-2 border-t border-gray-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const values = value
                  ? value.split(',').map((v) => v.trim()).filter(Boolean)
                  : [];
                setSelectedValues(new Set(values));
                setIsOpen(false);
              }}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STATUS BADGE WITH EDIT
// ============================================

import type { ViolationStatus } from '@/types';

const STATUS_OPTIONS: ViolationStatus[] = [
  'Assessing',
  'Working',
  'Waiting on Client',
  'Submitted',
  'Review Resolved',
  'Denied',
  'Ignored',
  'Resolved',
  'Acknowledged',
];

const getStatusBadgeClass = (status: ViolationStatus): string => {
  const baseClass = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap';
  switch (status) {
    case 'Assessing':
      return `${baseClass} bg-blue-500/20 text-blue-400`;
    case 'Working':
      return `${baseClass} bg-cyan-500/20 text-cyan-400`;
    case 'Waiting on Client':
      return `${baseClass} bg-yellow-500/20 text-yellow-400`;
    case 'Submitted':
      return `${baseClass} bg-purple-500/20 text-purple-400`;
    case 'Review Resolved':
      return `${baseClass} bg-teal-500/20 text-teal-400`;
    case 'Denied':
      return `${baseClass} bg-red-500/20 text-red-400`;
    case 'Resolved':
      return `${baseClass} bg-green-500/20 text-green-400`;
    case 'Ignored':
      return `${baseClass} bg-gray-500/20 text-gray-400`;
    case 'Acknowledged':
      return `${baseClass} bg-indigo-500/20 text-indigo-400`;
    default:
      return `${baseClass} bg-gray-500/20 text-gray-400`;
  }
};

interface EditableStatusCellProps {
  value: ViolationStatus;
  onSave: (value: ViolationStatus) => Promise<void>;
}

export function EditableStatusCell({ value, onSave }: EditableStatusCellProps) {
  return (
    <EditableSelectCell
      value={value}
      options={STATUS_OPTIONS}
      onSave={onSave}
      renderValue={(v) => <span className={getStatusBadgeClass(v)}>{v}</span>}
      renderOption={(v) => <span className={getStatusBadgeClass(v)}>{v}</span>}
    />
  );
}

// ============================================
// IMPACT BADGE WITH EDIT
// ============================================

type ImpactType = 'High' | 'Low' | 'No impact';

const IMPACT_OPTIONS: ImpactType[] = ['High', 'Low', 'No impact'];

const getImpactBadgeClass = (impact: string): string => {
  const baseClass = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  switch (impact) {
    case 'High':
      return `${baseClass} bg-red-500/20 text-red-400`;
    case 'Low':
      return `${baseClass} bg-yellow-500/20 text-yellow-400`;
    default:
      return `${baseClass} bg-gray-500/20 text-gray-500`;
  }
};

interface EditableImpactCellProps {
  value: ImpactType;
  onSave: (value: ImpactType) => Promise<void>;
}

export function EditableImpactCell({ value, onSave }: EditableImpactCellProps) {
  return (
    <EditableSelectCell
      value={value}
      options={IMPACT_OPTIONS}
      onSave={onSave}
      renderValue={(v) => <span className={getImpactBadgeClass(v)}>{v}</span>}
      renderOption={(v) => <span className={getImpactBadgeClass(v)}>{v}</span>}
    />
  );
}

// ============================================
// DOCS NEEDED CELL
// ============================================

const DOCS_NEEDED_OPTIONS = ['Invoice', 'LOA', 'Safety Cert', 'Lab Report'];

interface EditableDocsNeededCellProps {
  value: string;
  onSave: (value: string) => Promise<void>;
}

export function EditableDocsNeededCell({ value, onSave }: EditableDocsNeededCellProps) {
  return (
    <EditableMultiSelectCell
      value={value}
      options={DOCS_NEEDED_OPTIONS}
      onSave={onSave}
      placeholder="None"
    />
  );
}
