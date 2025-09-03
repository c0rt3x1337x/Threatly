import React from 'react';
import { Article } from '../types/Article';

interface ArticleCardProps {
  article: Article;
  onReadToggle?: (articleId: string) => void;
  onSpamToggle?: (articleId: string) => void;
  onDelete?: (articleId: string) => void;
  isRead?: boolean;
  keywords?: Record<string, { name: string; displayName: string }>;
  isAdmin?: boolean;
}

const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onReadToggle,
  onSpamToggle,
  onDelete,
  isRead = false,
  keywords = {},
  isAdmin = false
}) => {
  // Type guard function for keyword objects
  const isKeywordObject = (match: any): match is { _id: string; displayName?: string; name?: string } => {
    return match && typeof match === 'object' && '_id' in match && typeof match._id === 'string';
  };
  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 transform hover:-translate-y-1 ${isRead ? 'opacity-75' : ''}`}>
      {/* Action buttons - positioned absolutely in top-right */}
      <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
        {onReadToggle && (
          <button
            onClick={() => {
              console.log('Read toggle button clicked for article:', article._id);
              onReadToggle(article._id);
            }}
            className={`p-2 rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 ${
              isRead 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:bg-green-500 hover:text-white'
            }`}
            title={isRead ? 'Mark as unread' : 'Mark as read'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}
        {onSpamToggle && (
          <button
            onClick={() => onSpamToggle(article._id)}
            className="p-2 rounded-full shadow-lg backdrop-blur-sm bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:bg-red-500 hover:text-white transition-all duration-200"
            title="Mark as spam"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => {
              console.log('Delete button clicked for article:', article._id);
              onDelete(article._id);
            }}
            className="p-2 rounded-full shadow-lg backdrop-blur-sm bg-white/90 dark:bg-gray-700/90 text-gray-600 dark:text-gray-300 hover:bg-red-600 hover:text-white transition-all duration-200"
            title="Delete article"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Read indicator */}
      {isRead && (
        <div className="absolute top-4 left-4">
          <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {/* Header with source and date */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {article.source?.charAt(0).toUpperCase() || 'N'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{article.source}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {article.isoDate ? formatDate(article.isoDate) : 'No date'}
              </p>
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
          {article.title}
        </h3>
        
        {/* Content preview */}
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 leading-relaxed">
          {article.content}
        </p>
        
        {/* Tags and badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Source tag */}
          {article.source && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-600">
              📰 {article.source}
            </span>
          )}
          
          {/* Industry tags */}
          {article.industries && article.industries.length > 0 ? (
            article.industries.map((industry, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-md border border-blue-200 dark:border-blue-700">
                🏭 {industry}
              </span>
            ))
          ) : article.industry && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-md border border-blue-200 dark:border-blue-700">
              🏭 {article.industry}
            </span>
          )}
          
          {/* Alert matches - Enhanced display */}
          {article.alertMatches && article.alertMatches.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {article.alertMatches.map((match, index) => {
                if (typeof match === 'string') {
                  // Legacy format - show truncated ID
                  return (
                    <span key={index} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 text-xs font-medium rounded-md border border-orange-200 dark:border-orange-700">
                      🔍 {match.substring(0, 8)}...
                    </span>
                  );
                } else if (isKeywordObject(match)) {
                  // New format with keyword details
                  return (
                    <span key={match._id} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 text-xs font-medium rounded-md border border-orange-200 dark:border-orange-700">
                      🔍 {match.displayName || match.name || 'Unknown'}
                    </span>
                  );
                } else {
                  return null;
                }
              })}
            </div>
          )}
          
          {/* Threat Level - Enhanced colors */}
          {article.threatLevel && article.threatLevel !== 'NONE' && (
            <span className={`px-2 py-1 text-xs font-medium rounded-md border ${
              article.threatLevel === 'HIGH' || article.threatLevel === 'CRITICAL'
                ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700'
                : article.threatLevel === 'MEDIUM'
                ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-700'
                : 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700'
            }`}>
              🚨 {article.threatLevel}
            </span>
          )}

          {/* Threat Type */}
          {article.threatType && article.threatType !== 'N/A' && (
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 text-xs font-medium rounded-md border border-purple-200 dark:border-purple-700">
              🎯 {article.threatType}
            </span>
          )}
        </div>
        
        {/* Footer with read more link */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            {article.read && (
              <span className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Read</span>
              </span>
            )}
            {article.saved && (
              <span className="flex items-center space-x-1">
                <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
                <span>Saved</span>
              </span>
            )}
          </div>
          
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium text-sm transition-colors duration-200 group/link"
          >
            <span>Read full article</span>
            <svg className="w-4 h-4 transform group-hover/link:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300 pointer-events-none"></div>
    </div>
  );
};

export default ArticleCard;
