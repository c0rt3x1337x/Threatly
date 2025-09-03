import React from 'react';

interface MatchedKeyword {
  _id: string;
  name: string;
  displayName: string;
  ownerEmail?: string;
}

interface MatchedKeywordsDisplayProps {
  alertMatches: (string | MatchedKeyword)[];
  isAdmin: boolean;
}

const MatchedKeywordsDisplay: React.FC<MatchedKeywordsDisplayProps> = ({ alertMatches, isAdmin }) => {
  if (!alertMatches || alertMatches.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1">
        {alertMatches.map((match, index) => {
          if (typeof match === 'string') {
            // Legacy format - just show the ID
            return (
              <span
                key={index}
                className="px-1 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-sm"
              >
                {match.substring(0, 6)}...
              </span>
            );
          } else if (match && typeof match === 'object' && match._id) {
            // New format with keyword details
            return (
              <span
                key={match._id}
                className="px-1 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-sm"
              >
                {match.displayName || match.name || 'Unknown'}
              </span>
            );
          } else {
            // Fallback for malformed data
            return (
              <span
                key={index}
                className="px-1 py-0.5 bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400 text-xs rounded-sm"
              >
                ?
              </span>
            );
          }
        })}
      </div>
  );
};

export default MatchedKeywordsDisplay;

