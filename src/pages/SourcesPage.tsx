import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface Source {
  _id: string;
  name: string;
  url: string;
  category: string;
  type: string;
  status?: string;
  error?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isodate?: string;
  lastFetch?: string;
  fetchCount?: number;
  errorCount?: number;
}

const SourcesPage: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'news' | 'forum'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updatingSource, setUpdatingSource] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    category: 'general',
    type: 'news'
  });
  const [editForm, setEditForm] = useState({
    name: '',
    url: '',
    category: 'general',
    type: 'news',
    isodate: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [runningSources, setRunningSources] = useState<Set<string>>(new Set());
  const [sourceResults, setSourceResults] = useState<Record<string, { success: boolean; message: string; timestamp: string; articlesFetched?: number; processingTime?: string }>>({});

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSources();
      setSources(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch sources');
      console.error('Error fetching sources:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSources = () => {
    let filtered = sources;
    
    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(source => {
        if (activeTab === 'news') {
          return source.type === 'news';
        } else if (activeTab === 'forum') {
          return source.type === 'forum';
        }
        return true;
      });
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(source =>
        source.name && source.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getCategoryColor = (category: string | undefined) => {
    if (!category) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    
    switch (category.toLowerCase()) {
      case 'security':
      case 'cybersecurity':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'technology':
      case 'telecommunications':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'finance':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'automotive':
      case 'transportation':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'ics-ot':
      case 'manufacturing':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'healthcare':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      case 'energy':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'government':
      case 'defense':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'retail':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'education':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'malware':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'vulnerabilities':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'threat-intelligence':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Adding source:', newSource);
    
    if (!newSource.name.trim() || !newSource.url.trim()) {
      setError('Name and URL are required');
      return;
    }
    
    setAddingSource(true);
    setError(null);
    
    try {
      const result = await apiService.addSource(newSource);
      console.log('Source added successfully:', result);
      setNewSource({ name: '', url: '', category: 'general', type: 'news' });
      setShowAddForm(false);
      await fetchSources();
    } catch (err) {
      console.error('Error adding source:', err);
      setError(`Failed to add source: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAddingSource(false);
    }
  };

  const handleToggleActive = async (sourceId: string, currentActive: boolean) => {
    try {
      const currentSource = sources.find(s => s._id === sourceId);
      if (!currentSource) {
        console.error('Source not found:', sourceId);
        return;
      }

             await apiService.updateSource(sourceId, {
         name: currentSource.name || '',
         url: currentSource.url || '',
         category: currentSource.category || 'general',
         type: currentSource.type || 'news',
         isActive: !currentActive
       });
      fetchSources();
    } catch (err) {
      console.error('Error updating source:', err);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!window.confirm('Are you sure you want to delete this source?')) return;
    
    try {
      await apiService.deleteSource(sourceId);
      fetchSources();
    } catch (err) {
      console.error('Error deleting source:', err);
    }
  };



  const handleEditSource = (source: Source) => {
    setEditingSource(source);
    
    // Convert ISO date to date input format (YYYY-MM-DD)
    let isodate = '';
    if (source.isodate) {
      try {
        const date = new Date(source.isodate);
        isodate = date.toISOString().split('T')[0];
      } catch (error) {
        console.error('Error parsing ISO date:', error);
        isodate = new Date().toISOString().split('T')[0];
      }
    } else {
      isodate = new Date().toISOString().split('T')[0];
    }
    
    setEditForm({
      name: source.name || '',
      url: source.url || '',
      category: source.category || 'general',
      type: source.type || 'news',
      isodate: isodate
    });
    setShowEditModal(true);
  };

  const handleUpdateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSource) return;

    if (!editForm.name.trim() || !editForm.url.trim()) {
      setError('Name and URL are required');
      return;
    }

    setUpdatingSource(true);
    setError(null);

    try {
      console.log('Updating source:', editingSource._id, {
        name: editForm.name,
        url: editForm.url,
        category: editForm.category,
        type: editForm.type,
        isActive: editingSource.isActive
      });

      // Update the source
      const updateResult = await apiService.updateSource(editingSource._id, {
        name: editForm.name,
        url: editForm.url,
        category: editForm.category,
        type: editForm.type,
        isActive: editingSource.isActive
      });

      console.log('Update result:', updateResult);

      // Update the lastFetch date if it was provided
      if (editForm.isodate) {
        try {
          const lastFetchDate = new Date(editForm.isodate + 'T00:00:00.000Z').toISOString();
          console.log('Updating lastFetch to:', lastFetchDate);
          const lastFetchUpdateResult = await apiService.updateSourceLastFetch(editingSource._id, lastFetchDate);
          console.log('LastFetch update result:', lastFetchUpdateResult);
        } catch (dateError) {
          console.error('Error updating lastFetch:', dateError);
          setError('Failed to update lastFetch. Please check the date format.');
          return;
        }
      }

      setShowEditModal(false);
      setEditingSource(null);
      await fetchSources();
    } catch (err) {
      console.error('Error updating source:', err);
      setError(`Failed to update source: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUpdatingSource(false);
    }
  };

  const handleResetTime = async (sourceId: string) => {
    try {
      // Calculate 1 week ago from now
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const isoDate = oneWeekAgo.toISOString();
      
      console.log(`Resetting lastFetch for source ${sourceId} to: ${isoDate}`);
      
      const result = await apiService.updateSourceLastFetch(sourceId, isoDate);
      console.log('Reset time result:', result);
      
      await fetchSources();
      
      // Show success message
      console.log('LastFetch reset successfully');
    } catch (err) {
      console.error('Error resetting lastFetch:', err);
      setError(`Failed to reset lastFetch: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleRunSource = async (sourceId: string) => {
    try {
      console.log('Starting to run source:', sourceId);
      
      // Add source to running set
      setRunningSources(prev => new Set(prev).add(sourceId));
      
      // Clear any previous results for this source
      setSourceResults(prev => {
        const newResults = { ...prev };
        delete newResults[sourceId];
        return newResults;
      });

      console.log('Calling API to run source...');
      const result = await apiService.runSource(sourceId);
      console.log('API result:', result);
      
      // Store the result
      setSourceResults(prev => ({
        ...prev,
        [sourceId]: {
          success: result.success,
          message: result.message || result.error || 'Operation completed',
          timestamp: new Date().toISOString(),
          articlesFetched: result.data?.articlesFetched,
          processingTime: result.data?.processingTime
        }
      }));

      console.log('Refreshing sources...');
      // Refresh sources to get updated status
      await fetchSources();

    } catch (err) {
      console.error('Error running source:', err);
      
      // Store error result
      setSourceResults(prev => ({
        ...prev,
        [sourceId]: {
          success: false,
          message: err instanceof Error ? err.message : 'Failed to run source',
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      console.log('Removing source from running set');
      // Remove source from running set
      setRunningSources(prev => {
        const newSet = new Set(prev);
        newSet.delete(sourceId);
        return newSet;
      });
    }
  };

  const handleClearError = async (sourceId: string) => {
    try {
      await apiService.clearSourceError(sourceId);
      await fetchSources();
    } catch (err) {
      console.error('Error clearing source error:', err);
      setError(`Failed to clear error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent"></div>
              <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredSources = getFilteredSources();
  const newsCount = sources.filter(s => s.type === 'news').length;
  const forumCount = sources.filter(s => s.type === 'forum').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header Section */}
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
              Threat Intelligence Sources
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Manage your RSS feeds and data sources for comprehensive threat monitoring
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sources</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{sources.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">News Sources</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{newsCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                  <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Forum Sources</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{forumCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4">
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                      activeTab === 'all'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    All Sources ({sources.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('news')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                      activeTab === 'news'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    News ({newsCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('forum')}
                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
                      activeTab === 'forum'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Forums ({forumCount})
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Header with Search and Add Button */}
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {activeTab === 'all' ? 'All Sources' : activeTab === 'news' ? 'News Sources' : 'Forum Sources'}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {searchQuery.trim() 
                      ? `${filteredSources.length} source${filteredSources.length !== 1 ? 's' : ''} found for "${searchQuery}"`
                      : `${filteredSources.length} source${filteredSources.length !== 1 ? 's' : ''} found`
                    }
                  </p>
                </div>
                
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Search sources by name..."
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Source
                </button>
              </div>

              {/* Add Source Form */}
              {showAddForm && (
                <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New Source
                  </h3>
                  <form onSubmit={handleAddSource} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Source Name
                        </label>
                        <input
                          type="text"
                          value={newSource.name}
                          onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Enter source name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          RSS URL
                        </label>
                        <input
                          type="url"
                          value={newSource.url}
                          onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="https://example.com/rss"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Category
                        </label>
                        <select
                          value={newSource.category}
                          onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="general">General</option>
                          <option value="security">Security</option>
                          <option value="technology">Technology</option>
                          <option value="finance">Finance</option>
                          <option value="automotive">Automotive</option>
                          <option value="ics-ot">ICS/OT</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="energy">Energy</option>
                          <option value="government">Government</option>
                          <option value="defense">Defense</option>
                          <option value="telecommunications">Telecommunications</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="retail">Retail</option>
                          <option value="education">Education</option>
                          <option value="transportation">Transportation</option>
                          <option value="cybersecurity">Cybersecurity</option>
                          <option value="malware">Malware</option>
                          <option value="vulnerabilities">Vulnerabilities</option>
                          <option value="threat-intelligence">Threat Intelligence</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Type
                        </label>
                        <select
                          value={newSource.type}
                          onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="news">News</option>
                          <option value="forum">Forum</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <button 
                        type="submit" 
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={addingSource}
                      >
                        {addingSource ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Adding...
                          </div>
                        ) : (
                          'Add Source'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                        disabled={addingSource}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                  </div>
                </div>
              )}

              {/* Sources List */}
              {filteredSources.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {searchQuery.trim() 
                      ? 'No sources found matching your search'
                      : activeTab === 'all' 
                      ? 'No sources found'
                      : activeTab === 'news'
                      ? 'No news sources found'
                      : 'No forum sources found'
                    }
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {searchQuery.trim()
                      ? `No sources found matching "${searchQuery}". Try adjusting your search terms.`
                      : activeTab === 'all' 
                      ? 'Add your first source to get started with threat intelligence monitoring.'
                      : activeTab === 'news'
                      ? 'Add news sources to monitor security threats and vulnerabilities.'
                      : 'Add forum sources to track community discussions and insights.'
                    }
                  </p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Your First Source
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSources.map((source) => (
                    <div key={source._id} className="bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-6 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {source.name}
                              </h3>
                              {source.error ? (
                                <div className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                  <span className="text-xs text-red-600 dark:text-red-400 font-medium">Inactive</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                                                         <span className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(source.category)}`}>
                               {source.category || 'Unknown'}
                             </span>
                                                         <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                               {source.type || (source.url && (source.url.toLowerCase().includes('reddit') || source.url.toLowerCase().includes('forum')) ? 'forum' : 'news')}
                             </span>
                            {source.error && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                                Error
                              </span>
                            )}
                          </div>
                          
                                                     <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 break-all">
                             {source.url || 'No URL provided'}
                           </p>
                          
                          {source.error && (
                            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <p className="text-red-600 dark:text-red-400 text-sm">
                                <strong>Error:</strong> {source.error}
                              </p>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Created: {new Date(source.createdAt).toLocaleDateString()} • 
                            Updated: {new Date(source.updatedAt).toLocaleDateString()}
                                {source.lastFetch && (
      <span className="ml-2">
        • Last Fetch: {new Date(source.lastFetch).toLocaleDateString()}
      </span>
    )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2 ml-4">
                          {/* Run Source Button */}
                          <button
                            onClick={() => handleRunSource(source._id)}
                            disabled={runningSources.has(source._id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              runningSources.has(source._id)
                                ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                            }`}
                          >
                            {runningSources.has(source._id) ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                                Running...
                              </div>
                            ) : (
                              'Run Source'
                            )}
                          </button>

                          {/* Run Result Status */}
                          {sourceResults[source._id] && (
                            <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
                              sourceResults[source._id].success
                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800'
                                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">
                                  {sourceResults[source._id].success ? '✓ Success' : '✗ Failed'}
                                </span>
                                <span className="text-xs opacity-75">
                                  {new Date(sourceResults[source._id].timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="mt-1 text-xs">
                                {sourceResults[source._id].message}
                                {sourceResults[source._id].articlesFetched && (
                                  <span className="ml-2">
                                    • {sourceResults[source._id].articlesFetched} articles
                                  </span>
                                )}
                                {sourceResults[source._id].processingTime && (
                                  <span className="ml-2">
                                    • {sourceResults[source._id].processingTime}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={() => handleEditSource(source)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200"
                          >
                            Edit
                          </button>
                          
                          <button
                            onClick={() => handleToggleActive(source._id, source.isActive)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              source.isActive
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                            }`}
                          >
                            {source.isActive ? 'Active' : 'Inactive'}
                          </button>
                          
                          <button
                            onClick={() => handleResetTime(source._id)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-all duration-200"
                          >
                            Reset Time
                          </button>
                          
                          {source.error && (
                            <button
                              onClick={() => handleClearError(source._id)}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-all duration-200"
                            >
                              Clear Error
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteSource(source._id)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Source Modal */}
      {showEditModal && editingSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Source
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSource(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdateSource} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Source Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="Enter source name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RSS URL
                    </label>
                    <input
                      type="url"
                      value={editForm.url}
                      onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="https://example.com/rss"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="general">General</option>
                      <option value="security">Security</option>
                      <option value="technology">Technology</option>
                      <option value="finance">Finance</option>
                      <option value="automotive">Automotive</option>
                      <option value="ics-ot">ICS/OT</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="energy">Energy</option>
                      <option value="government">Government</option>
                      <option value="defense">Defense</option>
                      <option value="telecommunications">Telecommunications</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="retail">Retail</option>
                      <option value="education">Education</option>
                      <option value="transportation">Transportation</option>
                      <option value="cybersecurity">Cybersecurity</option>
                      <option value="malware">Malware</option>
                      <option value="vulnerabilities">Vulnerabilities</option>
                      <option value="threat-intelligence">Threat Intelligence</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type
                    </label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="news">News</option>
                      <option value="forum">Forum</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Fetch Date
                  </label>
                  <input
                    type="date"
                    value={editForm.isodate}
                    onChange={(e) => setEditForm({ ...editForm, isodate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    This date determines from when the RSS feed will start fetching articles. Only articles newer than this date will be processed.
                  </p>
                </div>
                
                <div className="flex space-x-4">
                  <button 
                    type="submit" 
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={updatingSource}
                  >
                    {updatingSource ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      'Update Source'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingSource(null);
                    }}
                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                    disabled={updatingSource}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SourcesPage;
