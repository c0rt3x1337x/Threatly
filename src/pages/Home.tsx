import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { Article } from '../types/Article';
import FilterBar from '../components/FilterBar';
import SearchBar from '../components/SearchBar';
import ArticleList from '../components/ArticleList';
import { useViewedArticles } from '../context/ViewedArticlesContext';
import { useReadStatus } from '../context/ReadStatusContext';

const Home: React.FC = () => {
  const { clearViewedArticles } = useViewedArticles();
  const { readStatus, refreshReadStatus, getReadStats, markAllAsRead } = useReadStatus();
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
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
  const [keywords, setKeywords] = useState<Record<string, { name: string; displayName: string }>>({});

  useEffect(() => {
    fetchArticles();
    fetchKeywords();
  }, []);

  useEffect(() => {
    const filterArticles = async () => {
      try {
        // If we have a search term, use backend search
        if (searchTerm.trim()) {
          console.log('Using backend search for:', searchTerm);
          let searchResults: Article[] = [];
          
          try {
            searchResults = await apiService.searchArticles(searchTerm);
            console.log('Search results received:', searchResults.length, 'articles');
            console.log('Sample search results:', searchResults.slice(0, 2).map((a: Article) => ({ title: a.title, source: a.source })));
          } catch (error) {
            console.error('Search API error:', error);
            // Fallback to client-side search
            searchResults = articles.filter((article: Article) => 
              article.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              article.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              article.source?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            console.log('Fallback search results:', searchResults.length, 'articles');
          }
          
          // Apply additional filters to search results
          let filtered = searchResults;

          // Apply industry filter
          if (filters.industry) {
            filtered = filtered.filter((article: Article) => {
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
            filtered = filtered.filter((article: Article) => {
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
            filtered = filtered.filter((article: Article) => article.threatLevel === filters.threatLevel);
          }

          // Apply threat type filter
          if (filters.threatType) {
            filtered = filtered.filter((article: Article) => article.threatType === filters.threatType);
          }

          // Apply source filter
          if (filters.source) {
            filtered = filtered.filter((article: Article) => article.source === filters.source);
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
            
            filtered = filtered.filter((article: Article) => {
              const articleDate = new Date(article.isoDate || article.isodate || article.pubDate || 0);
              return articleDate >= cutoffDate;
            });
          }

          // Type filtering is now handled by the backend

          // Apply hide read filter
          if (filters.hideRead) {
            filtered = filtered.filter((article: Article) => !readStatus[article._id]);
          }

          // Spam articles are now excluded by the backend by default

          // Apply sorting
          if (filters.sortBy === 'newest') {
            filtered.sort((a: Article, b: Article) => new Date(b.isoDate || b.isodate || b.pubDate || new Date()).getTime() - new Date(a.isoDate || a.isodate || a.pubDate || new Date()).getTime());
          } else if (filters.sortBy === 'oldest') {
            filtered.sort((a: Article, b: Article) => new Date(a.isoDate || a.isodate || a.pubDate || new Date()).getTime() - new Date(b.isoDate || b.isodate || b.pubDate || new Date()).getTime());
          }

          setFilteredArticles(filtered);
          return;
        }

        // If we have type filter or source filter, use backend filtering
        if (filters.type || filters.source) {
          console.log('Using backend filtering due to type or source filter:', { type: filters.type, source: filters.source });
          try {
            const queryParams = new URLSearchParams();
            if (filters.type) queryParams.append('type', filters.type);
            if (filters.source) queryParams.append('source', filters.source);
            
            const filteredData = await apiService.getAllArticles(`?${queryParams.toString()}`);
            setFilteredArticles(filteredData);
            return;
          } catch (error) {
            console.error('Error fetching filtered articles:', error);
            // Fall back to client-side filtering
          }
        }

        // Otherwise, use client-side filtering
        let filtered = articles;

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

        // Type filtering is now handled by the backend

        // Apply hide read filter
        if (filters.hideRead) {
          filtered = filtered.filter((article) => !readStatus[article._id]);
        }

        // Spam articles are now excluded by the backend by default

        // Apply sorting
        if (filters.sortBy === 'newest') {
          filtered.sort((a, b) => new Date(b.isoDate || b.isodate || b.pubDate || new Date()).getTime() - new Date(a.isoDate || a.isodate || a.pubDate || new Date()).getTime());
        } else if (filters.sortBy === 'oldest') {
          filtered.sort((a, b) => new Date(a.isoDate || a.isodate || a.pubDate || new Date()).getTime() - new Date(b.isoDate || b.isodate || b.pubDate || new Date()).getTime());
        }

        setFilteredArticles(filtered);
      } catch (error) {
        console.error('Error filtering articles:', error);
      }
    };

    filterArticles();
  }, [articles, searchTerm, filters, readStatus]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use getAllArticlesWithAlerts to fetch all articles, not just first page
      // This ensures the hide read filter works properly across all articles
      const data = await apiService.getAllArticlesWithAlerts();
      console.log('Received articles from API:', data.length);
      console.log('Sample articles with types:', data.slice(0, 3).map(a => ({ title: a.title, type: a.type, source: a.name })));
      setArticles(data);
      
      // Refresh read status for all articles
      if (data.length > 0) {
        const articleIds = data.map(article => article._id);
        await refreshReadStatus(articleIds);
      }
      
      // Get read statistics
      const stats = await getReadStats();
      setReadStats(stats);
    } catch (error) {
      console.error('Error fetching articles:', error);
      setError('Failed to fetch articles');
    } finally {
      setLoading(false);
    }
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

  const handleFilterChange = (filterName: string, value: any) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleSearchChange = (value: string) => {
    console.log('Search term changed to:', value);
    setSearchTerm(value);
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Get all article IDs from the current articles list
      const articleIds = articles.map(article => article._id);
      await markAllAsRead(articleIds);
      
      // Refresh the read stats after marking all as read
      const newStats = await getReadStats();
      setReadStats(newStats);
    } catch (error) {
      console.error('Error marking all articles as read:', error);
    }
  };

  const handleRefresh = async () => {
    await fetchArticles();
  };

  const handleDeleteAllArticles = async () => {
    if (!window.confirm('Are you sure you want to delete ALL articles? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.deleteAllArticles();
      setArticles([]);
      setFilteredArticles([]);
      setReadStats(null);
    } catch (error) {
      console.error('Error deleting all articles:', error);
      alert('Error: Failed to delete all articles. Please try again.');
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!window.confirm('Are you sure you want to cleanup duplicate articles? This will remove duplicate content while keeping the oldest version.')) {
      return;
    }

    try {
      const result = await apiService.cleanupDuplicates();
      if (result.success) {
        alert(`Cleanup completed! Found ${result.summary.duplicatesFound} duplicate groups and deleted ${result.summary.articlesDeleted} articles.`);
        // Refresh the articles list
        await fetchArticles();
      } else {
        alert('Cleanup failed. Please try again.');
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      alert('Error: Failed to cleanup duplicates. Please try again.');
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    try {
      // Remove the article from the current lists
      setArticles(prev => prev.filter(article => article._id !== articleId));
      setFilteredArticles(prev => prev.filter(article => article._id !== articleId));
      
      // Refresh stats
      const newStats = await getReadStats();
      setReadStats(newStats);
    } catch (error) {
      console.error('Error updating lists after deletion:', error);
    }
  };

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
                  Articles ({filteredArticles.length})
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
                    onClick={handleCleanupDuplicates}
                    className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-medium transition-colors duration-200"
                  >
                    Cleanup Duplicates
                  </button>
                  <button
                    onClick={handleDeleteAllArticles}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium transition-colors duration-200"
                  >
                    Delete All Articles
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
            
            <ArticleList articles={filteredArticles} loading={loading} onDelete={handleDeleteArticle} keywords={keywords} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 