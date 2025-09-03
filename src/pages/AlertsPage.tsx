import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Article } from '../types/Article';
import FilterBar from '../components/FilterBar';
import SearchBar from '../components/SearchBar';
import ArticleList from '../components/ArticleList';
import { useViewedArticles } from '../context/ViewedArticlesContext';
import { useReadStatus } from '../context/ReadStatusContext';
import { useSavedArticles } from '../context/SavedArticlesContext';
import { useAuth } from '../context/AuthContext';

interface Keyword {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const { refreshReadStatus, getReadStats, readStatus } = useReadStatus();
  const { refreshSavedStatus } = useSavedArticles();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    fetchArticles();
    fetchKeywords();
  }, []);

  // Update read stats when readStatus changes
  useEffect(() => {
    if (filteredArticles.length > 0) {
      const readCount = filteredArticles.filter(article => readStatus[article._id]).length;
      const unreadCount = filteredArticles.length - readCount;
      const readPercentage = filteredArticles.length > 0 ? Math.round((readCount / filteredArticles.length) * 100) : 0;
      
      setReadStats({
        totalArticles: filteredArticles.length,
        readArticles: readCount,
        unreadArticles: unreadCount,
        readPercentage: readPercentage
      });
    }
  }, [readStatus, filteredArticles]);

  useEffect(() => {
    const filterArticles = async () => {
      try {
        let filtered: Article[];

        // If we have a search term, use backend search first
        if (searchTerm.trim()) {
          console.log('Using backend search for alerts:', searchTerm);
          const searchResults = await apiService.searchArticles(searchTerm);
          filtered = searchResults;
        } else {
          // Start with all articles
          filtered = articles;
        }

        // Show articles that have any alert matches
        filtered = filtered.filter(article => 
          article.alertMatches && article.alertMatches.length > 0
        );

        // Apply other filters
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
        if (filters.threatLevel) {
          filtered = filtered.filter((article) => article.threatLevel === filters.threatLevel);
        }
        if (filters.threatType) {
          filtered = filtered.filter((article) => article.threatType === filters.threatType);
        }
        if (filters.type) {
          filtered = filtered.filter((article) => article.type === filters.type);
        }
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
          filtered = filtered.filter((article) => !readStatus[article._id]);
        }

        // Exclude spam articles from alerts (using new isSpam field)
        filtered = filtered.filter((article) => !article.isSpam);

        // Apply sorting
        filtered.sort((a, b) => {
          switch (filters.sortBy) {
            case 'newest':
              return new Date(b.isodate || 0).getTime() - new Date(a.isodate || 0).getTime();
            case 'oldest':
              return new Date(a.isodate || 0).getTime() - new Date(b.isodate || 0).getTime();
            case 'title':
              return (a.title || '').localeCompare(b.title || '');
            case 'title-desc':
              return (b.title || '').localeCompare(a.title || '');
            default:
              return 0;
          }
        });

        setFilteredArticles(filtered);
        
        // Update read stats for filtered articles
        const readCount = filtered.filter(article => article.read).length;
        const unreadCount = filtered.length - readCount;
        const readPercentage = filtered.length > 0 ? Math.round((readCount / filtered.length) * 100) : 0;
        
        setReadStats({
          totalArticles: filtered.length,
          readArticles: readCount,
          unreadArticles: unreadCount,
          readPercentage: readPercentage
        });
      } catch (error) {
        console.error('Error filtering articles:', error);
        setError('Failed to filter articles');
      }
    };

    filterArticles();
  }, [articles, searchTerm, filters, readStatus]);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the new authenticated alerts endpoint that filters by user ownership
      const response = await apiService.getAlertsArticles(1, 1000); // Get first 1000 articles
      const allArticles = response.data;
      
      // Set articles
      setArticles(allArticles);
      
      // Only set error if no articles were returned
      if (!allArticles || allArticles.length === 0) {
        setError('No articles found');
        setFilteredArticles([]);
      } else {
        // Clear any previous error if we have articles
        setError(null);
        
        // Show articles that have any alert matches
        let initialFiltered = allArticles.filter(article => 
          article.alertMatches && article.alertMatches.length > 0
        );
        setFilteredArticles(initialFiltered);
        
        // Refresh read status and saved status
        const articleIds = allArticles.map(article => article._id);
        await Promise.all([
          refreshReadStatus(articleIds),
          refreshSavedStatus(articleIds)
        ]);
        
        // Calculate read stats locally for the filtered articles
        const readCount = initialFiltered.filter(article => article.read).length;
        const unreadCount = initialFiltered.length - readCount;
        const readPercentage = initialFiltered.length > 0 ? Math.round((readCount / initialFiltered.length) * 100) : 0;
        
        setReadStats({
          totalArticles: initialFiltered.length,
          readArticles: readCount,
          unreadArticles: unreadCount,
          readPercentage: readPercentage
        });
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
      setError('Failed to fetch articles');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchKeywords = useCallback(async () => {
    try {
      const keywordsData = await apiService.getKeywords();
      setKeywords(keywordsData);
    } catch (error) {
      console.error('Error fetching keywords:', error);
    }
  }, []);

  const handleFilterChange = (filterName: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };



  const handleRefresh = async () => {
    await fetchArticles();
    await fetchKeywords();
  };

  const handleDeleteArticle = async (articleId: string) => {
    try {
      // Remove the article from the current lists
      setArticles(prev => prev.filter(article => article._id !== articleId));
      setFilteredArticles(prev => prev.filter(article => article._id !== articleId));
      
      // Update read stats locally
      const readCount = filteredArticles.filter(article => article._id !== articleId && article.read).length;
      const unreadCount = filteredArticles.filter(article => article._id !== articleId && !article.read).length;
      const totalCount = filteredArticles.length - 1;
      const readPercentage = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
      
      setReadStats({
        totalArticles: totalCount,
        readArticles: readCount,
        unreadArticles: unreadCount,
        readPercentage: readPercentage
      });
    } catch (error) {
      console.error('Error updating lists after deletion:', error);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <SearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />
          
          {/* Alerts Title */}
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
              All Alerts
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center mt-2">
              View all articles with active threat intelligence alerts
            </p>
          </div>
          
          <FilterBar filters={filters} onFilterChange={handleFilterChange} />
          
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-sm border border-gray-200 dark:border-dark-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  All Alerts ({filteredArticles.length})
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
                    onClick={handleRefresh}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors duration-200"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
            
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400 dark:text-red-300" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
                  </div>
                </div>
              </div>
            )}
            
            <ArticleList 
              articles={filteredArticles} 
              loading={loading} 
              onDelete={handleDeleteArticle} 
              keywords={keywords.reduce((acc, keyword) => {
                acc[keyword._id] = { name: keyword.name, displayName: keyword.displayName };
                return acc;
              }, {} as Record<string, { name: string; displayName: string }>)} 
              isAdmin={user?.role === 'admin'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsPage;
