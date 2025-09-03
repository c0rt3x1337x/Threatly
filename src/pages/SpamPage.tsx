import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Article } from '../types/Article';
import { useReadStatus } from '../context/ReadStatusContext';
import { useSavedArticles } from '../context/SavedArticlesContext';
import { useAuth } from '../context/AuthContext';
import ArticleList from '../components/ArticleList';
import FilterBar from '../components/FilterBar';
import SearchBar from '../components/SearchBar';

const SpamPage: React.FC = () => {
  const { user } = useAuth();
  const [spamArticles, setSpamArticles] = useState<Article[]>([]);
  const [filteredSpamArticles, setFilteredSpamArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<Record<string, { name: string; displayName: string }>>({});
  const { refreshReadStatus, getReadStats, markAllAsRead } = useReadStatus();
  const { refreshSavedStatus } = useSavedArticles();
  const [readStats, setReadStats] = useState<{
    totalArticles: number;
    readArticles: number;
    unreadArticles: number;
    readPercentage: number;
  } | null>(null);
  const [filters, setFilters] = useState({
    industry: '',
    severity: '',
    type: '',
    source: '',
    timeFilter: '',
    sortBy: 'newest',
    hideRead: false,
    threatLevel: '',
    threatType: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSpamArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getSpamArticles();
      setSpamArticles(data);

      // Refresh read status for spam articles
      if (data.length > 0) {
        const articleIds = data.map((article: Article) => article._id);
        await refreshReadStatus(articleIds);
        await refreshSavedStatus(articleIds);
      }

      // Get read statistics
      const stats = await getReadStats();
      setReadStats(stats);
    } catch (err) {
      console.error('Error fetching spam articles:', err);
      setError('Failed to fetch spam articles');
    } finally {
      setLoading(false);
    }
  }, [refreshReadStatus, refreshSavedStatus, getReadStats]);

  const filterSpamArticles = useCallback(() => {
    try {
      let filtered = spamArticles;

      // Apply search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter((article) => 
          article.title?.toLowerCase().includes(searchLower) ||
          article.content?.toLowerCase().includes(searchLower) ||
          article.source?.toLowerCase().includes(searchLower)
        );
      }

      // Apply industry filter
      if (filters.industry) {
        filtered = filtered.filter((article) => {
          // Check if article has industries array and the selected industry is in it
          if (article.industries && Array.isArray(article.industries)) {
            return article.industries.includes(filters.industry);
          }
          // Fallback to single industry field
          return article.industry === filters.industry;
        });
      }

      // Apply severity filter (map to threatLevel since severity field doesn't exist)
      if (filters.severity) {
        filtered = filtered.filter((article) => {
          // Map severity filter to threatLevel
          const severityToThreatLevel: Record<string, string> = {
            'high': 'HIGH',
            'medium': 'MEDIUM', 
            'low': 'LOW'
          };
          const expectedThreatLevel = severityToThreatLevel[filters.severity];
          return article.threatLevel === expectedThreatLevel;
        });
      }

      // Apply threat level filter
      if (filters.threatLevel) {
        filtered = filtered.filter((article) => article.threatLevel === filters.threatLevel);
      }

      // Apply threat type filter
      if (filters.threatType) {
        filtered = filtered.filter((article) => article.threatType === filters.threatType);
      }

      // Apply source filter
      if (filters.source) {
        filtered = filtered.filter((article) => article.source === filters.source);
      }

      // Apply time filter
      if (filters.timeFilter) {
        const now = new Date();
        let cutoffDate: Date;
        
        switch (filters.timeFilter) {
          case '1day':
            cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '1week':
            cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '1month':
            cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '3months':
            cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoffDate = new Date(0); // Beginning of time
        }
        
        filtered = filtered.filter((article) => {
          const articleDate = new Date(article.isoDate || article.isodate || article.pubDate || 0);
          return articleDate >= cutoffDate;
        });
      }

      // Apply hide read filter
      if (filters.hideRead) {
        filtered = filtered.filter((article) => !article.read);
      }

      // Apply sorting
      if (filters.sortBy === 'newest') {
        filtered.sort((a, b) => new Date(b.isoDate || b.isodate || b.pubDate || new Date()).getTime() - new Date(a.isoDate || a.isodate || a.pubDate || new Date()).getTime());
      } else if (filters.sortBy === 'oldest') {
        filtered.sort((a, b) => new Date(a.isoDate || a.isodate || a.pubDate || new Date()).getTime() - new Date(b.isoDate || b.isodate || b.pubDate || new Date()).getTime());
      }

      setFilteredSpamArticles(filtered);
    } catch (error) {
      console.error('Error filtering spam articles:', error);
    }
  }, [spamArticles, filters, searchTerm]);

  useEffect(() => {
    fetchSpamArticles();
    fetchKeywords();
  }, [fetchSpamArticles]);

  useEffect(() => {
    filterSpamArticles();
  }, [filterSpamArticles]);

  const handleFilterChange = (filterName: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };

  const fetchKeywords = async () => {
    try {
      const keywordsData = await apiService.getKeywords();
      const keywordsMap: Record<string, { name: string; displayName: string }> = {};
      
      keywordsData.forEach((keyword: any) => {
        keywordsMap[keyword._id] = {
          name: keyword.name,
          displayName: keyword.displayName || keyword.name
        };
      });
      
      setKeywords(keywordsMap);
    } catch (err) {
      console.error('Error fetching keywords:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Get all article IDs from the current articles list
      const articleIds = spamArticles.map(article => article._id);
      await markAllAsRead(articleIds);
      
      // Refresh the read stats after marking all as read
      const newStats = await getReadStats();
      setReadStats(newStats);
    } catch (error) {
      console.error('Error marking all articles as read:', error);
    }
  };

  const handleRefresh = async () => {
    await fetchSpamArticles();
  };

  const handleDeleteAllSpam = async () => {
    if (!window.confirm('Are you sure you want to delete ALL spam articles? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteAllSpamArticles();
      setSpamArticles([]);
      setReadStats(null);
    } catch (error) {
      console.error('Error deleting all spam articles:', error);
      alert('Error: Failed to delete all spam articles. Please try again.');
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    try {
      await apiService.deleteArticle(articleId);
      // Remove the article from the current list
      setSpamArticles(prev => prev.filter(article => article._id !== articleId));
      
      // Refresh stats
      const newStats = await getReadStats();
      setReadStats(newStats);
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Error: Failed to delete article. Please try again.');
    }
  };

  // Check if user is admin - must be after all hooks are declared
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Only administrators can access the spam management page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-transparent"></div>
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <SearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />
          <FilterBar filters={filters} onFilterChange={handleFilterChange} />
          
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Spam Articles ({filteredSpamArticles.length})
                </h2>
                {readStats && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {readStats.readArticles} read • {readStats.unreadArticles} unread • {readStats.readPercentage}% complete
                  </div>
                )}
              </div>
              {!loading && (
                <div className="flex space-x-4">
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 font-medium transition-colors duration-200"
                  >
                    Mark All Read
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium transition-colors duration-200"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={handleDeleteAllSpam}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium transition-colors duration-200"
                  >
                    Delete All Spam
                  </button>
                </div>
              )}
            </div>
            
            {error && (
              <div className="card border-red-300 dark:border-red-500 bg-red-50 dark:bg-red-900/20 mb-6">
                <div className="p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <ArticleList 
              articles={filteredSpamArticles} 
              loading={loading} 
              onDelete={handleDeleteArticle}
              keywords={keywords}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpamPage;
