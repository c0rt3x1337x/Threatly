import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface WorkflowStats {
  lastRun: string;
  rssFetchSuccess: number;
  rssFetchFailed: number;
  articlesProcessed: number;
  newArticles: number;
  articlesWithAlerts: number;
  processingTime: string;
  tokensUsed: string;
  successRate: string;
}

interface OverviewStats {
  totalArticles: number;
  articlesWithAlerts: number;
  recentArticles: number;
  readArticles: number;
  unreadArticles: number;
  savedArticles: number;
  spamArticles: number;
}

interface FeedStats {
  name: string;
  url: string;
  isActive: boolean;
  totalArticles: number;
  recentArticles: number;
  lastFetch: string;
  status: string;
}

interface Prompt {
  _id: string;
  name: string;
  description: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowRun {
  _id: string;
  startTime: string;
  endTime: string;
  status: string;
  totalFeeds: number;
  successfulFeeds: number;
  failedFeeds: number;
  totalArticlesFetched: number;
  newArticles: number;
  articlesWithAlerts: number;
  processingTime: number;
  tokensUsed: number;
  error: string | null;
  createdAt: string;
}

interface OpenAIBilling {
  currentPeriod: {
    startDate: string;
    endDate: string;
    totalUsage: number;
    totalCost: number;
    currency: string;
  };
  subscription: {
    plan: string;
    status: string;
    softLimit: number;
    hardLimit: number;
  };
  monthlyUsage: {
    totalCost: number;
    dailyBreakdown: Array<{
      date: string;
      cost: number;
      tokens: number;
    }>;
  };
  modelUsage: {
    totalTokens: number;
    estimatedCost: number;
    lastUpdated: string;
  };
}

const StatisticsPage: React.FC = () => {
  const [workflowStats, setWorkflowStats] = useState<WorkflowStats | null>(null);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [feedStats, setFeedStats] = useState<FeedStats[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [workflowPagination, setWorkflowPagination] = useState({ total: 0, page: 1, limit: 10, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [selectedWorkflowRun, setSelectedWorkflowRun] = useState<WorkflowRun | null>(null);
  const [showWorkflowDetails, setShowWorkflowDetails] = useState(false);
  const [openAIBilling, setOpenAIBilling] = useState<OpenAIBilling | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow-runs' | 'prompts' | 'billing'>('overview');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPrompt, setTestPrompt] = useState<string>('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch each endpoint individually to handle failures gracefully
      console.log('Fetching statistics data...');
      const workflowData: any = await apiService.getWorkflowStatistics();
      console.log('Workflow data:', workflowData);
      const detailedData: any = await apiService.getDetailedStatistics();
      console.log('Detailed data:', detailedData);
      const promptsData: any = await apiService.getPrompts();
      console.log('Prompts data:', promptsData);
      const activePromptData: any = await apiService.getActivePrompt();
      console.log('Active prompt data:', activePromptData);
      const workflowRunsData: any = await apiService.getWorkflowRuns(10, 1);
      console.log('Workflow runs data:', workflowRunsData);
      const billingData: any = await apiService.getOpenAIBilling();
      console.log('Billing data:', billingData);

      setWorkflowStats(workflowData.workflow || {
        lastRun: new Date().toISOString(),
        rssFetchSuccess: 0,
        rssFetchFailed: 0,
        articlesProcessed: 0,
        newArticles: 0,
        articlesWithAlerts: 0,
        processingTime: '0s',
        tokensUsed: '0',
        successRate: '0%'
      });
      setOverviewStats(workflowData.overview || {
        totalArticles: 0,
        articlesWithAlerts: 0,
        recentArticles: 0,
        readArticles: 0,
        unreadArticles: 0,
        savedArticles: 0,
        spamArticles: 0
      });
      setFeedStats(detailedData?.feeds || []);
      setPrompts(Array.isArray(promptsData) ? promptsData : (promptsData?.data || []));
      setActivePrompt(activePromptData);
      setWorkflowRuns(workflowRunsData?.data?.runs || workflowRunsData?.runs || []);
      setWorkflowPagination(workflowRunsData?.data?.pagination || workflowRunsData?.pagination || { total: 0, page: 1, limit: 10, pages: 0 });
      setOpenAIBilling(billingData?.data || billingData);

    } catch (error) {
      console.error('Error fetching statistics:', error);
      setError('Failed to fetch statistics. Some data may be unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{ title: string; value: string | number; subtitle?: string; color?: string }> = ({ 
    title, 
    value, 
    subtitle, 
    color = 'bg-blue-500' 
  }) => (
    <div className={`${color} text-white rounded-lg p-6 shadow-lg`}>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="text-3xl font-bold mb-1">{value}</div>
      {subtitle && <p className="text-sm opacity-90">{subtitle}</p>}
    </div>
  );

  const ProgressBar: React.FC<{ value: number; max: number; label: string }> = ({ value, max, label }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>{label}</span>
          <span>{value} / {max}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setShowPromptModal(true);
  };

  const handleSavePrompt = async (updatedPrompt: Prompt) => {
    try {
      setSavingPrompt(true);
      await apiService.updatePrompt(updatedPrompt._id, updatedPrompt);
      await fetchStatistics(); // Refresh to get updated data
      setShowPromptModal(false);
      setEditingPrompt(null);
    } catch (error) {
      console.error('Error saving prompt:', error);
      setError('Failed to save prompt');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleTogglePromptActive = async (promptId: string, currentActive: boolean) => {
    try {
      if (currentActive) {
        // If already active, deactivate it
        const prompt = prompts.find(p => p._id === promptId);
        if (!prompt) return;
        
        const updatedPrompt = { ...prompt, isActive: false };
        await apiService.updatePrompt(promptId, updatedPrompt);
      } else {
        // If not active, activate it (this will deactivate others)
        await apiService.activatePrompt(promptId);
      }
      await fetchStatistics(); // Refresh to get updated data
    } catch (error) {
      console.error('Error toggling prompt:', error);
      setError('Failed to update prompt');
    }
  };

  const handleTestRun = async () => {
    try {
      setTestLoading(true);
      setTestResult(null);
      setTestPrompt('');
      
      // Get the current prompt content
      const currentPromptContent = activePrompt?.content || editingPrompt?.content || '';
      setTestPrompt(currentPromptContent);
      
      const result = await apiService.testRun();
      setTestResult(result);
      setShowTestModal(true);
    } catch (error) {
      console.error('Error running test:', error);
      setError('Failed to run test: ' + (error as Error).message);
    } finally {
      setTestLoading(false);
    }
  };

  const fetchWorkflowRunsPage = async (page: number) => {
    try {
      const data = await apiService.getWorkflowRuns(10, page);
      setWorkflowRuns(data.data?.runs || data.runs || []);
      setWorkflowPagination(data.data?.pagination || data.pagination || { total: 0, page: 1, limit: 10, pages: 0 });
    } catch (error) {
      console.error('Error fetching workflow runs page:', error);
      setError('Failed to fetch workflow runs');
    }
  };

  const formatDuration = (ms: number | undefined | null) => {
    if (ms === undefined || ms === null) {
      return '0s';
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatTokens = (tokens: number | undefined | null) => {
    if (tokens === undefined || tokens === null) {
      return '0';
    }
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const formatCost = (cost: number | undefined | null) => {
    if (cost === undefined || cost === null) {
      return '$0.0000';
    }
    return `$${cost.toFixed(4)}`;
  };

     // Prompt Edit Form Component
   const PromptEditForm: React.FC<{
     prompt: Prompt;
     onSave: (prompt: Prompt) => void;
     onCancel: () => void;
     saving: boolean;
     onTestRun: () => void;
     testLoading: boolean;
   }> = ({ prompt, onSave, onCancel, saving, onTestRun, testLoading }) => {
    const [formData, setFormData] = useState({
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      isActive: prompt.isActive
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
        ...prompt,
        ...formData
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prompt Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter prompt name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Active Status
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter prompt description"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Prompt Content
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={12}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-mono text-sm"
            placeholder="Enter the GPT prompt content..."
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            This prompt will be sent to GPT for article analysis and classification.
          </p>
        </div>

                 <div className="flex space-x-4">
           <button
             type="submit"
             disabled={saving}
             className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {saving ? (
               <div className="flex items-center justify-center">
                 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                 Saving...
               </div>
             ) : (
               'Save Prompt'
             )}
           </button>
           <button
             type="button"
             onClick={handleTestRun}
             disabled={testLoading}
             className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
           >
             {testLoading ? (
               <div className="flex items-center">
                 <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                 Testing...
               </div>
             ) : (
               '🧪 Test Run'
             )}
           </button>
           <button
             type="button"
             onClick={onCancel}
             disabled={saving}
             className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
           >
             Cancel
           </button>
         </div>
      </form>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={fetchStatistics}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Workflow Statistics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Detailed statistics about RSS feed processing and article analysis
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <nav className="flex space-x-8 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('workflow-runs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'workflow-runs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Workflow Runs
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'prompts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            GPT Prompts
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'billing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            OpenAI Billing
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Workflow Overview */}
          {workflowStats && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Last Workflow Run
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard 
                  title="RSS Feeds Success" 
                  value={workflowStats.rssFetchSuccess} 
                  subtitle="Successfully fetched"
                  color="bg-green-500"
                />
                <StatCard 
                  title="RSS Feeds Failed" 
                  value={workflowStats.rssFetchFailed} 
                  subtitle="Failed to fetch"
                  color="bg-red-500"
                />
                <StatCard 
                  title="Articles Processed" 
                  value={workflowStats.articlesProcessed} 
                  subtitle="Total articles"
                  color="bg-blue-500"
                />
                <StatCard 
                  title="New Articles" 
                  value={workflowStats.newArticles} 
                  subtitle="Last 7 days"
                  color="bg-purple-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                  <h3 className="text-lg font-semibold mb-4">Processing Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Processing Time:</span>
                      <span className="font-semibold">{workflowStats.processingTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tokens Used:</span>
                      <span className="font-semibold">{workflowStats.tokensUsed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Success Rate:</span>
                      <span className="font-semibold text-green-600">{workflowStats.successRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Articles with Alerts:</span>
                      <span className="font-semibold">{workflowStats.articlesWithAlerts}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Article Overview */}
          {overviewStats && (
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Article Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <StatCard 
                  title="Total Articles" 
                  value={overviewStats.totalArticles} 
                  color="bg-indigo-500"
                />
                <StatCard 
                  title="With Alerts" 
                  value={overviewStats.articlesWithAlerts} 
                  subtitle={`${overviewStats.totalArticles > 0 ? ((overviewStats.articlesWithAlerts / overviewStats.totalArticles) * 100).toFixed(1) : 0}%`}
                  color="bg-orange-500"
                />
                <StatCard 
                  title="Read Articles" 
                  value={overviewStats.readArticles} 
                  subtitle={`${overviewStats.totalArticles > 0 ? ((overviewStats.readArticles / overviewStats.totalArticles) * 100).toFixed(1) : 0}%`}
                  color="bg-green-500"
                />
                <StatCard 
                  title="Saved Articles" 
                  value={overviewStats.savedArticles} 
                  color="bg-yellow-500"
                />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Article Status</h3>
                <div className="space-y-4">
                  <ProgressBar 
                    value={overviewStats.readArticles} 
                    max={overviewStats.totalArticles} 
                    label="Read Articles"
                  />
                  <ProgressBar 
                    value={overviewStats.unreadArticles} 
                    max={overviewStats.totalArticles} 
                    label="Unread Articles"
                  />
                  <ProgressBar 
                    value={overviewStats.spamArticles} 
                    max={overviewStats.totalArticles} 
                    label="Spam Articles"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Workflow Runs Tab */}
      {activeTab === 'workflow-runs' && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Workflow Run History
          </h2>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Articles Fetched
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      New Articles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      With Alerts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tokens Used
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {workflowRuns.map((run) => (
                    <tr key={run._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(run.startTime).toLocaleDateString()} {new Date(run.startTime).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          run.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : run.status === 'failed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {run.totalArticlesFetched}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {run.newArticles}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {run.articlesWithAlerts}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatTokens(run.tokensUsed)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatDuration(run.processingTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedWorkflowRun(run);
                            setShowWorkflowDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {workflowPagination.pages > 1 && (
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => fetchWorkflowRunsPage(workflowPagination.page - 1)}
                    disabled={workflowPagination.page <= 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchWorkflowRunsPage(workflowPagination.page + 1)}
                    disabled={workflowPagination.page >= workflowPagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing page <span className="font-medium">{workflowPagination.page}</span> of{' '}
                      <span className="font-medium">{workflowPagination.pages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => fetchWorkflowRunsPage(workflowPagination.page - 1)}
                        disabled={workflowPagination.page <= 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => fetchWorkflowRunsPage(workflowPagination.page + 1)}
                        disabled={workflowPagination.page >= workflowPagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

             {/* Prompts Tab */}
       {activeTab === 'prompts' && (
         <div className="mb-8">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
               GPT Prompts Management
             </h2>
             <button
               onClick={() => {
                 setEditingPrompt({
                   _id: '',
                   name: '',
                   description: '',
                   content: '',
                   isActive: true,
                   createdAt: '',
                   updatedAt: ''
                 });
                 setShowPromptModal(true);
               }}
               className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
             >
               Add New Prompt
             </button>
           </div>

           {/* Active Prompt Display */}
           {activePrompt ? (
             <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 border border-green-200 dark:border-green-700 rounded-lg">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                   🎯 Currently Active Prompt
                 </h3>
                 <div className="flex items-center space-x-3">
                   <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                     Active
                   </span>
                   <button
                     onClick={handleTestRun}
                     disabled={testLoading}
                     className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                   >
                     {testLoading ? (
                       <div className="flex items-center">
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                         Testing...
                       </div>
                     ) : (
                       '🧪 Test Run'
                     )}
                   </button>
                 </div>
               </div>
               <div className="mb-4">
                 <h4 className="font-medium text-gray-900 dark:text-white mb-2">{activePrompt.name}</h4>
                 <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{activePrompt.description}</p>
                 <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                   {activePrompt.content}
                 </div>
               </div>
               <div className="text-xs text-gray-500 dark:text-gray-400">
                 <p>Created: {new Date(activePrompt.createdAt).toLocaleDateString()}</p>
                 <p>Updated: {new Date(activePrompt.updatedAt).toLocaleDateString()}</p>
               </div>
             </div>
           ) : (
             <div className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
               <div className="flex items-center mb-2">
                 <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                   ⚠️ No Active Prompt
                 </h3>
               </div>
               <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                 No prompt is currently active. The workflow will not be able to process articles without an active prompt. 
                 Please activate one of the prompts below or create a new one.
               </p>
             </div>
           )}

           
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prompts.map((prompt) => (
              <div key={prompt._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{prompt.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    prompt.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {prompt.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {prompt.description}
                </p>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <p>Created: {new Date(prompt.createdAt).toLocaleDateString()}</p>
                  <p>Updated: {new Date(prompt.updatedAt).toLocaleDateString()}</p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditPrompt(prompt)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors duration-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleTogglePromptActive(prompt._id, prompt.isActive)}
                    className={`px-3 py-2 text-sm rounded transition-colors duration-200 ${
                      prompt.isActive
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {prompt.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OpenAI Billing Tab */}
      {activeTab === 'billing' && openAIBilling && (
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            OpenAI API Billing
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard 
              title="Current Period Cost" 
              value={formatCost(openAIBilling.currentPeriod.totalCost)} 
              subtitle={`${openAIBilling.currentPeriod.startDate} to ${openAIBilling.currentPeriod.endDate}`}
              color="bg-red-500"
            />
            <StatCard 
              title="Total Usage" 
              value={formatTokens(openAIBilling.currentPeriod.totalUsage)} 
              subtitle="Tokens used this period"
              color="bg-blue-500"
            />
            <StatCard 
              title="Subscription Plan" 
              value={openAIBilling.subscription.plan} 
              subtitle={`Status: ${openAIBilling.subscription.status}`}
              color="bg-green-500"
            />
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Billing Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Current Period</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
                    <span>{new Date(openAIBilling.currentPeriod.startDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">End Date:</span>
                    <span>{new Date(openAIBilling.currentPeriod.endDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>
                    <span className="font-semibold">{formatCost(openAIBilling.currentPeriod.totalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Tokens:</span>
                    <span>{formatTokens(openAIBilling.currentPeriod.totalUsage)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Subscription</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                    <span>{openAIBilling.subscription.plan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`font-semibold ${
                      openAIBilling.subscription.status === 'active' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {openAIBilling.subscription.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Soft Limit:</span>
                    <span>{formatTokens(openAIBilling.subscription.softLimit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Hard Limit:</span>
                    <span>{formatTokens(openAIBilling.subscription.hardLimit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Run Details Modal */}
      {showWorkflowDetails && selectedWorkflowRun && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Workflow Run Details
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {new Date(selectedWorkflowRun.startTime).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {new Date(selectedWorkflowRun.endTime).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedWorkflowRun.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedWorkflowRun.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {formatDuration(selectedWorkflowRun.processingTime)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Feeds</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedWorkflowRun.totalFeeds}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Successful Feeds</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedWorkflowRun.successfulFeeds}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Failed Feeds</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedWorkflowRun.failedFeeds}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Success Rate</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedWorkflowRun.totalFeeds > 0 
                        ? ((selectedWorkflowRun.successfulFeeds / selectedWorkflowRun.totalFeeds) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Articles Fetched</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedWorkflowRun.totalArticlesFetched}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Articles</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedWorkflowRun.newArticles}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Articles with Alerts</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedWorkflowRun.articlesWithAlerts}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tokens Used</label>
                    <p className="text-sm text-gray-900 dark:text-white">{formatTokens(selectedWorkflowRun.tokensUsed)}</p>
                  </div>
                </div>
                
                {selectedWorkflowRun.error && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Error</label>
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900 p-2 rounded">
                      {selectedWorkflowRun.error}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowWorkflowDetails(false);
                    setSelectedWorkflowRun(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Edit Modal */}
      {showPromptModal && editingPrompt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingPrompt._id ? 'Edit Prompt' : 'Add New Prompt'}
              </h3>
              
                             <PromptEditForm
                 prompt={editingPrompt}
                 onSave={handleSavePrompt}
                 onCancel={() => {
                   setShowPromptModal(false);
                   setEditingPrompt(null);
                   setTestResult(null);
                 }}
                 saving={savingPrompt}
                 onTestRun={handleTestRun}
                 testLoading={testLoading}
               />


            </div>
          </div>
        </div>
      )}

             {/* Test Run Modal - Side by Side View */}
                {showTestModal && testResult && (
           <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50">
             <div className="relative top-5 mx-auto p-6 border-0 w-11/12 h-5/6 shadow-2xl rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                   <span className="mr-3 text-3xl">🧪</span>
                   Test Run Results
                 </h3>
                 <button
                   onClick={() => {
                     setShowTestModal(false);
                     setTestResult(null);
                     setTestPrompt('');
                   }}
                   className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
         
               {/* Test Article Info */}
               <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900 rounded-xl border border-blue-200 dark:border-blue-700">
                 <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                   <span className="mr-2 text-lg">📰</span>
                   Test Article Details
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div>
                     <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Title</p>
                     <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mt-1 line-clamp-2">
                       {testResult.testArticle.title.length > 100 
                         ? testResult.testArticle.title.substring(0, 100) + '...' 
                         : testResult.testArticle.title}
                     </p>
                   </div>
                   <div>
                     <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Source</p>
                     <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mt-1">{testResult.testArticle.source}</p>
                   </div>
                   <div>
                     <p className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wide">Date</p>
                     <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mt-1">
                       {new Date(testResult.testArticle.isoDate).toLocaleDateString()}
                     </p>
                   </div>
                 </div>
               </div>
         
               {/* Side by Side Content */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-4/5">
                 {/* Left Side - Prompt Sent */}
                 <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 rounded-xl p-5 border border-green-200 dark:border-green-700">
                   <h4 className="font-bold text-green-900 dark:text-green-100 mb-4 flex items-center">
                     <span className="mr-3 text-xl">📤</span>
                     Prompt Sent to GPT
                   </h4>
                   <div className="bg-white dark:bg-gray-800 border border-green-300 dark:border-green-600 rounded-lg p-4 h-full overflow-y-auto shadow-inner">
                     <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                       {testPrompt}
                     </pre>
                   </div>
                 </div>
         
                 {/* Right Side - GPT Response */}
                 <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900 rounded-xl p-5 border border-purple-200 dark:border-purple-700">
                   <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-4 flex items-center">
                     <span className="mr-3 text-xl">📥</span>
                     GPT Response
                   </h4>
                   <div className="bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-600 rounded-lg p-4 h-full overflow-y-auto shadow-inner">
                     <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                       {testResult.gptOutput}
                     </pre>
                   </div>
                 </div>
               </div>
         
               {/* Matched Keywords */}
               <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900 dark:to-orange-900 rounded-xl border border-amber-200 dark:border-amber-700">
                 <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center">
                   <span className="mr-2 text-lg">🔍</span>
                   Matched Keywords
                 </h4>
                 <div className="flex flex-wrap gap-3">
                   {testResult.matchedKeywords && testResult.matchedKeywords.length > 0 ? (
                     testResult.matchedKeywords.map((keywordId: string, index: number) => (
                       <span key={index} className="px-4 py-2 bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-200 text-sm font-medium rounded-full shadow-sm border border-amber-300 dark:border-amber-600">
                         {keywordId}
                       </span>
                     ))
                   ) : (
                     <span className="text-amber-700 dark:text-amber-300 text-sm font-medium">No keywords matched</span>
                   )}
                 </div>
               </div>
             </div>
           </div>
         )}

       {/* Refresh Button */}
       <div className="text-center">
         <button 
           onClick={fetchStatistics}
           className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
         >
           Refresh Statistics
         </button>
       </div>
     </div>
   );
 };

export default StatisticsPage;
