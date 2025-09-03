import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Article } from '../types/Article';
import { useViewedArticles } from '../context/ViewedArticlesContext';
import { useReadStatus } from '../context/ReadStatusContext';

interface ArticleDetailProps {
  article: Article | null;
  loading: boolean;
}

const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, loading }) => {
  const { markAsViewed } = useViewedArticles();
  const { markAsRead, isRead } = useReadStatus();

  // Mark article as viewed and read when it's loaded
  useEffect(() => {
    if (article) {
      markAsViewed(article._id);
      // Mark as read if not already read
      if (!isRead(article._id)) {
        markAsRead(article._id);
      }
    }
  }, [article, markAsViewed, markAsRead, isRead]);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSeverityColor = (severity: string | undefined) => {
    if (!severity) {
      return 'bg-gray-100 text-gray-800';
    }
    
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading article...</span>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Article not found</h3>
        <p className="text-gray-500 mb-4">The article you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          ← Back to Articles
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Articles
        </Link>
      </div>

      <article className={`bg-white rounded-lg shadow-sm border border-gray-200 p-8 ${
        article.severity === 'high' ? 'border-red-300 bg-red-50' : ''
      }`}>
        <header className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(article.severity)}`}>
                {article.severity ? article.severity.charAt(0).toUpperCase() + article.severity.slice(1) : 'Unknown'} Severity
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Published: {article.isodate ? formatDate(article.isodate) : 'Unknown'}
              </span>
              <span className="text-sm text-gray-500">
                Author: {article.author}
              </span>
              {article.name && (
                <span className="text-sm text-gray-500">
                  Source: {article.name}
                </span>
              )}
              
              <div className="flex items-center space-x-2">
                {article.name && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                    {article.name}
                  </span>
                )}
                {article.automotive === 1 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    Automotive Security
                  </span>
                )}
                {article.samsung_sdi === 1 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                    Samsung SDI Related
                  </span>
                )}
                {article.adyen === 1 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                    Adyen Related
                  </span>
                )}
                {/* Display industries array if available, otherwise fallback to single industry */}
                {article.industries && article.industries.length > 0 ? (
                  article.industries.map((industry, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {industry}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {article.industry || 'Unknown'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="prose max-w-none">
          <div className="text-gray-700 leading-relaxed mb-8">
            {article.content || 'No content available'}
          </div>
        </div>

        <footer className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Article ID: {article._id}
            </div>
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
            >
              Read Full Article →
            </a>
          </div>
        </footer>
      </article>
    </div>
  );
};

export default ArticleDetail; 