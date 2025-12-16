'use client';

import { Search, X, ChevronDown } from 'lucide-react';
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
    <div className="px-4 space-y-4">
      {/* Active/Resolved Toggle - Pill style */}
      <div className="flex justify-center">
        <div className="inline-flex bg-gray-800/50 rounded-full p-1">
          <button
            onClick={() => onTabChange('active')}
            className={`px-8 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
              tab === 'active'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => onTabChange('resolved')}
            className={`px-8 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
              tab === 'resolved'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Resolved
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search ASIN or product..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-11 pl-11 pr-10 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex gap-3">
        {/* Time Filter */}
        <div className="relative flex-1">
          <select
            value={timeFilter}
            onChange={(e) => onTimeFilterChange(e.target.value as TimeFilter)}
            className="w-full h-11 px-4 pr-10 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
          >
            <option value="all">All Time</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>

        {/* Status Filter - only show for active tab */}
        {tab === 'active' && (
          <div className="relative flex-1">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as ViolationStatus | 'all')}
              className="w-full h-11 px-4 pr-10 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
            >
              <option value="all">All Statuses</option>
              <option value="Assessing">Assessing</option>
              <option value="Working">Working</option>
              <option value="Waiting on Client">Waiting on Client</option>
              <option value="Submitted">Submitted</option>
              <option value="Review Resolved">Review Resolved</option>
              <option value="Denied">Denied</option>
              <option value="Ignored">Ignored</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          </div>
        )}
      </div>
    </div>
  );
}
