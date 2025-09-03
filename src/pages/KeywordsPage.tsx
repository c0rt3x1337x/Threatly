import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useDarkMode } from '../context/DarkModeContext';
import { useAuth } from '../context/AuthContext';

interface Keyword {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  ownerEmail?: string;
  ownerName?: string;
}

const KeywordsPage: React.FC = () => {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: ''
  });
  const { isDarkMode } = useDarkMode();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchKeywords();
  }, []);

  const fetchKeywords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getKeywords();
      setKeywords(data);
    } catch (error) {
      console.error('Error fetching keywords:', error);
      setError('Failed to fetch keywords');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.description.trim()) {
      setError('Name and description are required');
      return;
    }

    try {
      setError(null);
      
      if (editingKeyword) {
        // Update existing keyword
        const updateData = {
          name: formData.name,
          displayName: formData.displayName || formData.name,
          description: formData.description
        };
        console.log('Updating keyword with data:', updateData);
        const updatedKeyword = await apiService.updateKeyword(editingKeyword._id, updateData);
        console.log('Response from updateKeyword:', updatedKeyword);
        
        // Update the keywords list with the returned data
        setKeywords(keywords.map(k => 
          k._id === editingKeyword._id 
            ? { ...k, ...updatedKeyword }
            : k
        ));
        setEditingKeyword(null);
      } else {
        // Add new keyword
        const addData = {
          name: formData.name,
          displayName: formData.displayName || formData.name,
          description: formData.description
        };
        const newKeyword = await apiService.addKeyword(addData);
        setKeywords([newKeyword, ...keywords]);
      }
      
      setFormData({ name: '', displayName: '', description: '' });
      setShowAddForm(false);
      setEditingKeyword(null);
    } catch (error: any) {
      console.error('Error saving keyword:', error);
      setError(error.response?.data?.error || 'Failed to save keyword');
    }
  };

  const handleEdit = (keyword: Keyword) => {
    setEditingKeyword(keyword);
    setFormData({
      name: keyword.name,
      displayName: keyword.displayName,
      description: keyword.description
    });
    setShowAddForm(true);
  };

  const handleDelete = async (keywordId: string) => {
    if (!window.confirm('Are you sure you want to delete this keyword?')) {
      return;
    }

    try {
      setError(null);
      await apiService.deleteKeyword(keywordId);
      setKeywords(keywords.filter(k => k._id !== keywordId));
    } catch (error: any) {
      console.error('Error deleting keyword:', error);
      setError(error.response?.data?.error || 'Failed to delete keyword');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingKeyword(null);
    setFormData({ name: '', displayName: '', description: '' });
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getKeywordColor = (name: string) => {
    const colors: Record<string, string> = {
      automotive: 'blue',
      finance: 'purple',
      healthcare: 'green',
      technology: 'indigo',
      energy: 'yellow',
      default: 'gray'
    };
    return colors[name] || colors.default;
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-dark-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading keywords...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-dark-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                Keywords
              </h1>
              <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {isAdmin 
                  ? 'Manage all keywords across all users in the system'
                  : 'Manage your custom keywords to monitor in threat intelligence articles'
                }
              </p>
              {isAdmin && (
                <p className={`text-sm ${isDarkMode ? 'text-blue-300' : 'text-blue-600'} mt-1`}>
                  You can view, edit, and delete keywords from all users
                </p>
              )}
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Keyword
            </button>
          </div>
        </div>

        {/* User Instructions Info Box */}
        {showInstructions ? (
          <div className={`mb-6 ${isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'} mr-3 mt-0.5`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-800'} mb-2`}>
                    How to Create Effective Keywords
                  </h3>
                  <button
                    onClick={() => setShowInstructions(false)}
                    className={`text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} hover:underline`}
                  >
                    Hide
                  </button>
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-blue-200' : 'text-blue-700'} space-y-2`}>
                  <p>
                    Keywords are used to match articles and generate alerts. Here's how to create effective ones:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <strong>Name:</strong> Short identifier for your keyword (e.g., automotive_security)
                    </li>
                    <li>
                      <strong>Display Name:</strong> Friendly name shown in the UI (e.g., Automotive Security)
                    </li>
                    <li>
                      <strong>Description:</strong> Detailed rule for GPT to detect matches. Be specific: include product names, components, technologies, or threat context.
                    </li>
                  </ul>
                  <div className={`${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} rounded-lg p-3 mt-3`}>
                    <p className={`text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-800'} font-medium mb-1`}>Example:</p>
                    <p className={`text-xs ${isDarkMode ? 'text-blue-200' : 'text-blue-800'} italic`}>
                      "1 if the article discusses automotive security, vehicle cybersecurity, connected car threats, or related technologies like CAN bus security or ECU protection."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 text-center">
            <button
              onClick={() => setShowInstructions(true)}
              className={`inline-flex items-center text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} hover:underline`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Show keyword creation instructions
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`mb-6 ${isDarkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-xl p-4`}>
            <div className="flex items-center">
              <svg className={`h-5 w-5 ${isDarkMode ? 'text-red-400' : 'text-red-400'} mr-3`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>{error}</p>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className={`mb-8 ${isDarkMode ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-6`}>
            <div className="flex items-center mb-6">
              <svg className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} mr-3`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {editingKeyword ? 'Edit Keyword' : 'Add New Keyword'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Keyword Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                    isDarkMode 
                      ? 'bg-dark-700 border-dark-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Enter keyword name (e.g., automotive_security)"
                  required
                  disabled={!!editingKeyword && !isAdmin} // Only admins can change keyword names
                />
                {editingKeyword && !isAdmin && (
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Only admins can change keyword names. Regular users can only modify the display name and description.
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="displayName" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Display Name *
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={formData.displayName || formData.name}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                    isDarkMode 
                      ? 'bg-dark-700 border-dark-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Enter display name (e.g., Automotive Security)"
                  required
                />
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  This is the human-readable name that will be displayed in the interface.
                </p>
              </div>
              
              <div>
                <label htmlFor="description" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Description *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className={`w-full px-4 py-3 rounded-lg border transition-colors duration-200 ${
                    isDarkMode 
                      ? 'bg-dark-700 border-dark-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  placeholder="Describe what this keyword should monitor..."
                  required
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {editingKeyword ? 'Update Keyword' : 'Add Keyword'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-dark-700 hover:bg-dark-600 text-gray-300 border border-dark-600' 
                      : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Keywords List */}
        <div className="space-y-6">
          {keywords.length === 0 ? (
            <div className={`${isDarkMode ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-12 text-center`}>
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${isDarkMode ? 'bg-dark-700' : 'bg-gray-100'} flex items-center justify-center`}>
                <svg className={`h-8 w-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} mb-2`}>No keywords yet</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6`}>
                Get started by adding your first keyword to monitor threat intelligence articles.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className={`inline-flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                }`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Your First Keyword
              </button>
            </div>
          ) : (
            keywords.map((keyword) => {
              const color = getKeywordColor(keyword.name);
              return (
                <div key={keyword._id} className={`${isDarkMode ? 'bg-dark-800 border-dark-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-6 hover:shadow-xl transition-all duration-200`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`w-10 h-10 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>
                          <svg className={`w-5 h-5 text-${color}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {keyword.displayName}
                          </h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300`}>
                            {keyword.name}
                          </span>
                        </div>
                      </div>
                      
                      <div className={`${isDarkMode ? 'bg-dark-700' : 'bg-gray-50'} rounded-lg p-4 mb-4`}>
                        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {keyword.description}
                        </p>
                      </div>
                      
                      {/* Owner information for admins */}
                      {isAdmin && keyword.ownerEmail && (
                        <div className={`${isDarkMode ? 'bg-dark-700' : 'bg-gray-50'} rounded-lg p-3 mb-4 border-l-4 border-blue-500`}>
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className={`text-xs font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                              Owner: {keyword.ownerName || keyword.ownerEmail}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4 text-xs">
                        <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Created: {formatDate(keyword.createdAt)}
                        </div>
                        {keyword.updatedAt !== keyword.createdAt && (
                          <div className={`flex items-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Updated: {formatDate(keyword.updatedAt)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-6">
                      <button
                        onClick={() => handleEdit(keyword)}
                        className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                          isDarkMode 
                            ? 'bg-dark-700 hover:bg-dark-600 text-gray-300 border border-dark-600' 
                            : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm'
                        }`}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(keyword._id)}
                        className="flex items-center px-4 py-2 rounded-lg font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-all duration-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/30"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default KeywordsPage;
