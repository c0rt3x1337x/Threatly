import React, { useState, useEffect } from 'react';
import { useSavedArticles } from '../context/SavedArticlesContext';
import { Article } from '../types/Article';
import ArticleList from '../components/ArticleList';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';

const SavedArticlesPage: React.FC = () => {
  const { getSavedArticles } = useSavedArticles();
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<Record<string, { name: string; displayName: string }>>({});

  useEffect(() => {
    const fetchSavedArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        const articles = await getSavedArticles();
        setSavedArticles(articles);
      } catch (error) {
        console.error('Error fetching saved articles:', error);
        setError('Failed to load saved articles. Please check if the backend server is running.');
      } finally {
        setLoading(false);
      }
    };

    const fetchKeywords = async () => {
      try {
        const keywordsData = await apiService.getKeywords();
        const keywordsMap = keywordsData.reduce((acc: Record<string, { name: string; displayName: string }>, keyword: any) => {
          acc[keyword._id] = { name: keyword.name, displayName: keyword.displayName };
          return acc;
        }, {});
        setKeywords(keywordsMap);
      } catch (error) {
        console.error('Error fetching keywords:', error);
      }
    };

    fetchSavedArticles();
    fetchKeywords();

    // Listen for article save/unsave events to refresh the list
    const handleArticleSaved = () => {
      console.log('Article saved event received, refreshing saved articles...');
      fetchSavedArticles();
    };

    const handleArticleUnsaved = () => {
      console.log('Article unsaved event received, refreshing saved articles...');
      fetchSavedArticles();
    };

    window.addEventListener('articleSaved', handleArticleSaved);
    window.addEventListener('articleUnsaved', handleArticleUnsaved);

    return () => {
      window.removeEventListener('articleSaved', handleArticleSaved);
      window.removeEventListener('articleUnsaved', handleArticleUnsaved);
    };
  }, [getSavedArticles]);

  // Add a refresh function that can be called when articles are saved/unsaved
  const refreshSavedArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const articles = await getSavedArticles();
      setSavedArticles(articles);
    } catch (error) {
      console.error('Error refreshing saved articles:', error);
      setError('Failed to refresh saved articles.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Saved Articles ({savedArticles.length})
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Articles you've saved to your saved articles
                </p>
              </div>
              <button
                onClick={refreshSavedArticles}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Refreshing...
                  </div>
                ) : (
                  'Refresh'
                )}
              </button>
            </div>
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</div>
                  </div>
                </div>
              </div>
            )}
            
            {!loading && savedArticles.length === 0 && !error && (
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No saved articles yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Start saving articles to see them here. Click the "☆ Save" button on any article to add it to your saved articles.
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Browse Articles
                </Link>
              </div>
            )}
            
            <ArticleList articles={savedArticles} loading={loading} keywords={keywords} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedArticlesPage; 