import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface FilterBarProps {
  filters: {
    industry: string;
    severity: string;
    type: string;
    source: string;
    timeFilter: string;
    sortBy: string;
    hideRead?: boolean;
    threatLevel: string;
    threatType: string;
  };
  onFilterChange: (filterName: string, value: any) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange }) => {
  const severities = ['high', 'medium', 'low'];
  const threatLevels = ['HIGH', 'MEDIUM', 'LOW', 'NONE'];
  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'title', label: 'Title A-Z' },
    { value: 'title-desc', label: 'Title Z-A' }
  ];
  const timeFilterOptions = [
    { value: '', label: 'All Time' },
    { value: '1day', label: 'Last 1 Day' },
    { value: '1week', label: 'Last 1 Week' },
    { value: '1month', label: 'Last 1 Month' },
    { value: '3months', label: 'Last 3 Months' }
  ];
  const [types, setTypes] = useState<string[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [threatTypes, setThreatTypes] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [availableTypes, availableIndustries, availableSources, availableThreatTypes] = await Promise.all([
          apiService.getAvailableTypes(),
          apiService.getAvailableIndustries(),
          apiService.getAvailableSources(),
          apiService.getAvailableThreatTypes()
        ]);
        setTypes(availableTypes);
        setIndustries(availableIndustries);
        setSources(availableSources);
        setThreatTypes(availableThreatTypes);
      } catch (error) {
        console.error('Error fetching filter data:', error);
        // Fallback to default values
        setTypes(['news', 'forum']);
        setIndustries([
          'Technology', 'Finance', 'Healthcare', 'Automotive', 'Energy', 'Government',
          'Manufacturing', 'Retail', 'Telecommunications', 'Transportation', 'Education',
          'Defense', 'Aerospace', 'Pharmaceuticals', 'Biotechnology', 'Real Estate',
          'Insurance', 'Banking', 'Investment', 'Cryptocurrency', 'E-commerce',
          'Media', 'Entertainment', 'Gaming', 'Sports', 'Food & Beverage',
          'Agriculture', 'Mining', 'Construction', 'Hospitality', 'Tourism',
          'Legal', 'Consulting', 'Marketing', 'Advertising', 'Human Resources',
          'Environmental', 'Renewable Energy', 'Nuclear', 'Oil & Gas', 'Chemical',
          'Textiles', 'Fashion', 'Luxury Goods', 'Consumer Electronics', 'Semiconductors',
          'Cybersecurity', 'Artificial Intelligence', 'Machine Learning', 'Cloud Computing',
          'Blockchain', 'Fintech', 'Insurtech', 'Healthtech', 'Edtech', 'PropTech'
        ]);
        setSources([]);
        setThreatTypes(['malware', 'phishing', 'vulnerability', 'ransomware', 'data breach', 'social engineering', 'DDoS', 'APT', 'zero-day', 'insider threat']);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap gap-4 items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Filters:</span>
        
        {/* Industry Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Industry:</span>
          <select
            value={filters.industry}
            onChange={(e) => onFilterChange('industry', e.target.value)}
            className="text-sm border border-gray-300 dark:border-dark-600 rounded-md px-3 py-1.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-offset-dark-900 transition-all duration-200"
          >
            <option value="">All Industries</option>
            {industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Severity:</span>
          <select
            value={filters.severity}
            onChange={(e) => onFilterChange('severity', e.target.value)}
            className="text-sm border border-gray-300 dark:border-dark-600 rounded-md px-3 py-1.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-offset-dark-900 transition-all duration-200"
          >
            <option value="">All Severities</option>
            {severities.map((severity) => (
              <option key={severity} value={severity}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Type:</span>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
            className="text-sm border border-gray-300 dark:border-dark-600 rounded-md px-3 py-1.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-offset-dark-900 transition-all duration-200"
          >
            <option value="">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Source:</span>
          <select
            value={filters.source}
            onChange={(e) => onFilterChange('source', e.target.value)}
            className="text-sm border border-gray-300 dark:border-dark-600 rounded-md px-3 py-1.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-offset-dark-900 transition-all duration-200"
          >
            <option value="">All Sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        {/* Threat Level Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Threat Level:</span>
          <select
            value={filters.threatLevel}
            onChange={(e) => onFilterChange('threatLevel', e.target.value)}
            className="text-sm border border-gray-300 dark:border-dark-600 rounded-md px-3 py-1.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-offset-dark-900 transition-all duration-200"
          >
            <option value="">All Threat Levels</option>
            {threatLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Threat Type Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Threat Type:</span>
          <select
            value={filters.threatType}
            onChange={(e) => onFilterChange('threatType', e.target.value)}
            className="text-sm border border-gray-300 dark:border-dark-600 rounded-md px-3 py-1.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-offset-dark-900 transition-all duration-200"
          >
            <option value="">All Threat Types</option>
            {threatTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Time Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Time:</span>
          <select
            value={filters.timeFilter}
            onChange={(e) => onFilterChange('timeFilter', e.target.value)}
            className="text-sm border border-gray-300 dark:border-dark-600 rounded-md px-3 py-1.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-offset-dark-900 transition-all duration-200"
          >
            {timeFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700 dark:text-gray-300">Sort:</span>
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
            className="text-sm border border-gray-300 dark:border-dark-600 rounded-md px-3 py-1.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-offset-dark-900 transition-all duration-200"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>



        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.hideRead || false}
            onChange={(e) => onFilterChange('hideRead', e.target.checked)}
            className="w-4 h-4 text-primary-600 bg-gray-100 dark:bg-dark-700 border-gray-300 dark:border-dark-600 rounded focus:ring-primary-500 focus:ring-2 dark:focus:ring-offset-dark-900"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Hide Read Articles</span>
        </label>
      </div>
    </div>
  );
};

export default FilterBar; 