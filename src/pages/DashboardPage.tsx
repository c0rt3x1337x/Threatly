import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import { Article } from '../types/Article';
import { useDarkMode } from '../context/DarkModeContext';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface DashboardStats {
  totalArticles: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  automotiveSecurity: number;
  samsungSDI: number;
  adyenRelated: number;
  spamCount: number;
  readStats: {
    totalArticles: number;
    readArticles: number;
    unreadArticles: number;
    readPercentage: number;
  };
  typeDistribution: Array<{ name: string; value: number; color: string }>;
  dailyNewArticles: Array<{ date: string; count: number }>;
  topSources: Array<{ name: string; count: number }>;
  severityDistribution: Array<{ name: string; value: number; color: string }>;
  industryDistribution: Array<{ name: string; value: number; color: string }>;
  recentActivity: Array<{ date: string; articles: number; alerts: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { isDarkMode } = useDarkMode();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all articles for analysis
      const articles = await apiService.getAllArticles();
      console.log('Fetched articles for dashboard:', articles.length);
      
      // Get read statistics
      const readStats = await apiService.getReadStats();
      console.log('Read stats:', readStats);
      
      // Get general statistics
      const generalStats = await apiService.getStatistics();
      console.log('General stats:', generalStats);

      // Get feeds to create source-to-type mapping for type distribution
      const feeds = await apiService.getSources();
      console.log('Fetched feeds for type mapping:', feeds.length);
      
      const sourceTypeMap: Record<string, string> = {};
      feeds.forEach(feed => {
        sourceTypeMap[feed.name] = feed.type || 'unknown';
      });

      // Calculate type distribution for pie chart using source-to-type mapping
      const typeCounts: Record<string, number> = {};
      articles.forEach(article => {
        const type = sourceTypeMap[article.source] || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      const typeDistribution = Object.entries(typeCounts).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: COLORS[index % COLORS.length]
      }));

      // Calculate daily new articles for bar chart (last 7 days)
      const dailyNewArticles = calculateDailyNewArticles(articles);
      
      // Calculate top sources
      const topSources = calculateTopSources(articles);

      // Calculate severity distribution
      const severityCounts: Record<string, number> = {};
      articles.forEach(article => {
        const severity = article.severity || 'medium';
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      });

      const severityDistribution = Object.entries(severityCounts).map(([name, value], index) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: name === 'high' ? '#FF6B6B' : name === 'medium' ? '#FFD93D' : '#6BCF7F'
      }));

      // Calculate industry distribution
      const industryCounts: Record<string, number> = {};
      articles.forEach(article => {
        // Handle both single industry and industries array
        if (article.industries && article.industries.length > 0) {
          // If industries array exists, count each industry
          article.industries.forEach(industry => {
            industryCounts[industry] = (industryCounts[industry] || 0) + 1;
          });
        } else if (article.industry) {
          // If single industry field exists
          industryCounts[article.industry] = (industryCounts[article.industry] || 0) + 1;
        } else {
          // Default to 'Other' if no industry information
          industryCounts['Other'] = (industryCounts['Other'] || 0) + 1;
        }
      });

      const industryDistribution = Object.entries(industryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6)
        .map(([name, value], index) => ({
          name,
          value,
          color: COLORS[index % COLORS.length]
        }));

      // Calculate recent activity (last 7 days)
      const recentActivity = calculateRecentActivity(articles);

      setStats({
        totalArticles: generalStats.totalArticles || 0,
        highSeverity: generalStats.highSeverity || 0,
        mediumSeverity: generalStats.mediumSeverity || 0,
        lowSeverity: generalStats.lowSeverity || 0,
        automotiveSecurity: generalStats.automotiveSecurity || 0,
        samsungSDI: generalStats.samsungSDI || 0,
        adyenRelated: generalStats.adyenRelated || 0,
        spamCount: generalStats.spam || 0,
        readStats: {
          totalArticles: readStats.totalArticles || 0,
          readArticles: readStats.readArticles || 0,
          unreadArticles: readStats.unreadArticles || 0,
          readPercentage: readStats.readPercentage || 0
        },
        typeDistribution,
        dailyNewArticles,
        topSources,
        severityDistribution,
        industryDistribution,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(`Failed to load dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const calculateDailyNewArticles = (articles: Article[]) => {
    const dailyCounts: Record<string, number> = {};
    const now = new Date();
    
    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyCounts[dateStr] = 0;
    }
      
    // Count articles for each day
    articles.forEach(article => {
      // Use the correct date field (isoDate, isodate, or pubDate)
      const articleDate = new Date(article.isoDate || article.isodate || article.pubDate || 0);
      const daysDiff = Math.floor((now.getTime() - articleDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff >= 0 && daysDiff <= 6) {
        const dateStr = articleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
      }
    });
    
    return Object.entries(dailyCounts).map(([date, count]) => ({ date, count }));
  };

  const calculateTopSources = (articles: Article[]) => {
    const sourceCounts: Record<string, number> = {};
    articles.forEach(article => {
      const source = article.source || article.name || 'Unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    
    return Object.entries(sourceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  };

  const calculateRecentActivity = (articles: Article[]) => {
    const activity: Record<string, { articles: number; alerts: number }> = {};
    const now = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      activity[dateStr] = { articles: 0, alerts: 0 };
    }
    
    // Count articles and alerts for each day
    articles.forEach(article => {
      // Use the correct date field (isoDate, isodate, or pubDate)
      const articleDate = new Date(article.isoDate || article.isodate || article.pubDate || 0);
      const daysDiff = Math.floor((now.getTime() - articleDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff >= 0 && daysDiff <= 6) {
        const dateStr = articleDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        activity[dateStr].articles += 1;
        
        // Count alerts
        if (article.alertMatches && article.alertMatches.length > 0) {
          activity[dateStr].alerts += 1;
        }
      }
    });
    
    return Object.entries(activity).map(([date, data]) => ({ date, ...data }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null) {
      return '0';
    }
    return num.toLocaleString();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}>
          <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center mb-4">
            <svg className="h-8 w-8 text-red-400 dark:text-red-300 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Dashboard Error</h3>
          </div>
          <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-1`}>
                Threat Intelligence Dashboard
              </h1>
              <p className={`text-base ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Real-time overview of security threats and analytics
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm'
              } ${refreshing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
            >
              <svg 
                className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {/* Total Articles */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4`}>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                Total Articles
              </p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatNumber(stats.totalArticles)}
              </p>
            </div>
          </div>

          {/* Read Articles */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4`}>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                Read
              </p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatNumber(stats.readStats.readArticles)}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                {stats.readStats.readPercentage}%
              </p>
            </div>
          </div>

          {/* High Severity */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4`}>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                High Severity
              </p>
              <p className={`text-2xl font-bold text-red-600`}>
                {formatNumber(stats.highSeverity)}
              </p>
            </div>
          </div>

          {/* Medium Severity */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4`}>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                Medium Severity
              </p>
              <p className={`text-2xl font-bold text-yellow-600`}>
                {formatNumber(stats.mediumSeverity)}
              </p>
            </div>
          </div>

          {/* Low Severity */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4`}>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                Low Severity
              </p>
              <p className={`text-2xl font-bold text-green-600`}>
                {formatNumber(stats.lowSeverity)}
              </p>
            </div>
          </div>

          {/* Spam */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-4`}>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
              <p className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                Spam
              </p>
              <p className={`text-2xl font-bold text-orange-600`}>
                {formatNumber(stats.spamCount)}
              </p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Article Types Pie Chart */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
            <div className="flex items-center mb-4">
              <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              </svg>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Article Types Distribution
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.typeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                                     label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Daily New Articles Bar Chart */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
            <div className="flex items-center mb-4">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                New Articles (Last 7 Days)
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.dailyNewArticles}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="date" 
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  fontSize={12}
                />
                <YAxis 
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
                      </div>
                    </div>

        {/* Top Sources and Severity Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Sources */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
            <div className="flex items-center mb-4">
              <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Top Sources
              </h3>
            </div>
            <div className="space-y-3">
              {stats.topSources.map((source, index) => (
                <div key={source.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <svg className="h-4 w-4 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate max-w-32`}>
                      {source.name}
                    </span>
                    </div>
                  <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatNumber(source.count)}
                  </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Severity Distribution */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
            <div className="flex items-center mb-4">
              <svg className="h-5 w-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Severity Distribution
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.severityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                                     label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
                    </div>
                    </div>

        {/* Recent Activity and Industry Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Recent Activity */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
            <div className="flex items-center mb-4">
              <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Recent Activity (Last 7 Days)
              </h3>
                    </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="date" 
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  fontSize={12}
                />
                <YAxis 
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="articles" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="alerts" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
                  </div>

          {/* Industry Distribution */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
            <div className="flex items-center mb-4">
              <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Industry Distribution
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.industryDistribution} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  type="number"
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  fontSize={12}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  fontSize={12}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert Categories and Read Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Alert Categories */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
            <div className="flex items-center mb-4">
              <svg className="h-5 w-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Alert Categories
              </h3>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Automotive Security', count: stats.automotiveSecurity, color: 'blue', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
                { name: 'Samsung SDI', count: stats.samsungSDI, color: 'purple', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                { name: 'Adyen Related', count: stats.adyenRelated, color: 'orange', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' }
              ].map(({ name, count, color, icon }) => (
                <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center">
                    <svg className={`h-4 w-4 text-${color}-600 mr-3`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                    </svg>
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {name}
                    </span>
                  </div>
                  <span className={`text-lg font-bold text-${color}-600`}>
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Read Progress */}
          <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg shadow-sm border p-6`}>
            <div className="flex items-center mb-4">
              <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Reading Progress
              </h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Read Articles
                </span>
                <span className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatNumber(stats.readStats.readArticles)} / {formatNumber(stats.readStats.totalArticles)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${stats.readStats.readPercentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {stats.readStats.unreadArticles} unread
                </span>
                <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {stats.readStats.readPercentage}% complete
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;