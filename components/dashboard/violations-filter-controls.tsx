'use client';

import { Search, Command, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface FilterState {
  dateRange: string;
  statuses: string[];
  search: string;
  showNotesOnly?: boolean;
}

interface ViolationsFilterControlsProps {
  filters: FilterState;
  onFilterChange: (filters: Partial<FilterState>) => void;
  isActiveTab?: boolean;
}

export function ViolationsFilterControls({ filters, onFilterChange, isActiveTab = true }: ViolationsFilterControlsProps) {
  const defaultDateRange = isActiveTab ? 'All Time' : 'Last 30 Days';

  const handleSearchChange = (value: string) => {
    onFilterChange({ search: value });
  };

  const handleDateRangeChange = (value: string) => {
    onFilterChange({ dateRange: value });
  };

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      onFilterChange({ statuses: [] });
    } else {
      onFilterChange({ statuses: [value] });
    }
  };

  const clearFilters = () => {
    onFilterChange({
      dateRange: defaultDateRange,
      statuses: [],
      search: '',
      showNotesOnly: false,
    });
  };

  const activeFilterCount =
    filters.statuses.length +
    (filters.search ? 1 : 0) +
    (filters.dateRange !== defaultDateRange ? 1 : 0) +
    (filters.showNotesOnly ? 1 : 0);

  // Active tab status options
  const activeStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'Working', label: 'Working' },
    { value: 'Waiting on Client', label: 'Waiting on Client' },
    { value: 'Submitted', label: 'Submitted' },
    { value: 'Denied', label: 'Denied' },
  ];

  // Resolved tab status options
  const resolvedStatusOptions = [
    { value: 'all', label: 'All' },
    { value: 'Resolved', label: 'Resolved' },
    { value: 'Ignored', label: 'Ignored' },
  ];

  const statusOptions = isActiveTab ? activeStatusOptions : resolvedStatusOptions;

  // Date range options differ by tab
  const dateRangeOptions = isActiveTab
    ? [
        { value: 'All Time', label: 'All Time' },
        { value: 'Last 7 Days', label: 'Last 7 Days' },
        { value: 'Last 30 Days', label: 'Last 30 Days' },
        { value: 'Last 90 Days', label: 'Last 90 Days' },
      ]
    : [
        { value: 'Last 7 Days', label: 'Last 7 Days' },
        { value: 'Last 30 Days', label: 'Last 30 Days' },
        { value: 'Last 90 Days', label: 'Last 90 Days' },
        { value: 'All Time', label: 'All Time' },
      ];

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-card">
      {/* Top row: Main filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Date Range */}
        <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
          <SelectTrigger className="w-36 h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dateRangeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.statuses.length === 1 ? filters.statuses[0] : 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-44 h-10">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent className="bg-popover border border-border z-50">
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ASIN, Product, or Issue Type..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-16 h-10"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>

        {/* Clear filters button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground h-10"
          >
            <X className="h-4 w-4 mr-1" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active filters display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
          {filters.showNotesOnly && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80 bg-attention text-attention-foreground"
              onClick={() => onFilterChange({ showNotesOnly: false })}
            >
              With Notes &times;
            </Badge>
          )}
          {filters.statuses.map((status) => (
            <Badge
              key={status}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => onFilterChange({ statuses: filters.statuses.filter((s) => s !== status) })}
            >
              {status} &times;
            </Badge>
          ))}
          {filters.dateRange !== defaultDateRange && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => onFilterChange({ dateRange: defaultDateRange })}
            >
              {filters.dateRange} &times;
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
