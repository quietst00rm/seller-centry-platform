'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ViolationTab, TimeFilter, ViolationStatus } from '@/types';

interface FilterBarProps {
  tab: ViolationTab;
  timeFilter: TimeFilter;
  statusFilter: ViolationStatus | 'all';
  search: string;
  onTabChange: (tab: ViolationTab) => void;
  onTimeFilterChange: (time: TimeFilter) => void;
  onStatusFilterChange: (status: ViolationStatus | 'all') => void;
  onSearchChange: (search: string) => void;
}

export function FilterBar({
  tab,
  timeFilter,
  statusFilter,
  search,
  onTabChange,
  onTimeFilterChange,
  onStatusFilterChange,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="px-4 space-y-3">
      {/* Active/Resolved Toggle */}
      <div className="flex bg-card border border-border rounded-lg p-1">
        <button
          onClick={() => onTabChange('active')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors touch-target ${
            tab === 'active'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => onTabChange('resolved')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors touch-target ${
            tab === 'resolved'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Resolved
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search ASIN or product..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9 touch-target"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex gap-2">
        <Select value={timeFilter} onValueChange={(v) => onTimeFilterChange(v as TimeFilter)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>

        {tab === 'active' && (
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusFilterChange(v as ViolationStatus | 'all')}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Working">Working</SelectItem>
              <SelectItem value="Waiting on Client">Waiting on Client</SelectItem>
              <SelectItem value="Submitted">Submitted</SelectItem>
              <SelectItem value="Denied">Denied</SelectItem>
              <SelectItem value="Ignored">Ignored</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
