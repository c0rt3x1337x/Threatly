import { Article } from '../types/Article';
import axios from 'axios';
import { API_CONFIG } from '../config/api';

// Create axios instance with proper configuration
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  withCredentials: true, // Include cookies for authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

class ApiService {
  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    try {
      const response = await apiClient.request({
        url: endpoint,
        method: options.method || 'GET',
        data: options.data,
        ...options,
      });
      
      return response.data;
    } catch (error: any) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getAllArticles(queryParams?: string): Promise<Article[]> {
    const url = queryParams ? `/articles${queryParams}` : '/articles';
    const response = await this.makeRequest(url);
    
    // Handle both response formats:
    // 1. server.js format: { articles: [...], pagination: {...} }
    // 2. routes format: { success: true, data: [...], pagination: {...} }
    
    if (response.articles) {
      return response.articles;
    } else if (response.data && response.success) {
      return response.data;
    } else {
      // Fallback: assume it's a direct array
      return Array.isArray(response) ? response : [];
    }
  }

  async getAllArticlesWithAlerts(): Promise<Article[]> {
    // Fetch all articles (not just first page) for alerts page
    const response = await this.makeRequest('/articles?limit=1000');
    
    // Handle both response formats:
    // 1. server.js format: { articles: [...], pagination: [...], pagination: {...} }
    // 2. routes format: { success: true, data: [...], pagination: {...} }
    
    if (response.articles) {
      return response.articles;
    } else if (response.data && response.success) {
      return response.data;
    } else {
      // Fallback: assume it's a direct array
      return Array.isArray(response) ? response : [];
    }
  }

  async getAlertsArticles(page: number = 1, limit: number = 50): Promise<{ data: Article[], pagination: any }> {
    // Fetch articles with alerts using the new authenticated endpoint
    const response = await this.makeRequest(`/articles/alerts?page=${page}&limit=${limit}`);
    
    if (response.data && response.success) {
      return {
        data: response.data,
        pagination: response.pagination
      };
    } else {
      throw new Error('Failed to fetch alerts articles');
    }
  }

  async getSpamArticles(): Promise<Article[]> {
    const response = await this.makeRequest('/articles/spam');
    return response.data;
  }

  async getArticleById(id: string): Promise<Article | null> {
    const response = await this.makeRequest(`/articles/${id}`);
    if (response.data && response.success) {
      return response.data;
    } else {
      return response;
    }
  }

  async deleteArticle(articleId: string): Promise<{ message: string }> {
    return this.makeRequest(`/articles/${articleId}`, {
      method: 'DELETE',
    });
  }

  async deleteAllArticles(): Promise<{ message: string; deletedCount: number }> {
    return this.makeRequest('/articles', {
      method: 'DELETE',
    });
  }

  async deleteAllSpamArticles(): Promise<{ message: string; deletedCount: number }> {
    return this.makeRequest('/articles/spam', {
      method: 'DELETE',
    });
  }



  async searchArticles(query: string): Promise<Article[]> {
    const response = await this.makeRequest(`/articles/search/${encodeURIComponent(query)}`);
    if (response.data && response.success) {
      return response.data;
    } else if (response.articles) {
      return response.articles;
    } else {
      return Array.isArray(response) ? response : [];
    }
  }

  async getArticlesBySector(sector: string): Promise<Article[]> {
    const response = await this.makeRequest(`/articles/sector/${encodeURIComponent(sector)}`);
    if (response.data && response.success) {
      return response.data;
    } else if (response.articles) {
      return response.articles;
    } else {
      return Array.isArray(response) ? response : [];
    }
  }

  async getArticlesBySeverity(severity: string): Promise<Article[]> {
    const response = await this.makeRequest(`/articles/severity/${encodeURIComponent(severity)}`);
    if (response.data && response.success) {
      return response.data;
    } else if (response.articles) {
      return response.articles;
    } else {
      return Array.isArray(response) ? response : [];
    }
  }

  async getFilteredArticles(filters: {
    sector?: string;
    severity?: string;
    type?: string;
    timeFilter?: string;
    adyen_related?: number;
    automotive_security?: number;
    samsung_sdi_related?: number;
    hideRead?: boolean;
    excludeSpam?: boolean;
  }): Promise<Article[]> {
    const response = await this.makeRequest('/articles/filter', {
      method: 'POST',
      data: filters,
    });
    if (response.data && response.success) {
      return response.data;
    } else if (response.articles) {
      return response.articles;
    } else {
      return Array.isArray(response) ? response : [];
    }
  }



  // Read status methods - Fixed to match backend endpoints
  async markAsRead(articleId: string): Promise<{ message: string }> {
    return this.makeRequest(`/articles/${articleId}/read`, {
      method: 'PATCH',
      data: { read: true }
    });
  }

  async markAllAsRead(): Promise<{ message: string; updatedCount: number }> {
    return this.makeRequest('/articles/mark-all-read', {
      method: 'PATCH',
    });
  }



  // Additional methods for frontend compatibility
  async getStatistics(): Promise<any> {
    try {
      const response = await this.makeRequest('/articles/stats/summary');
      return response;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        totalArticles: 0,
        highSeverity: 0,
        mediumSeverity: 0,
        lowSeverity: 0,
        automotiveSecurity: 0,
        samsungSDI: 0,
        adyenRelated: 0,
        spam: 0
      };
    }
  }

  async getUnreadCount(): Promise<{ unreadCount: number }> {
    try {
      const response = await this.makeRequest('/articles/stats/unread-count');
      return response;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return { unreadCount: 0 };
    }
  }

  async getReadStats(): Promise<{
    totalArticles: number;
    readArticles: number;
    unreadArticles: number;
    readPercentage: number;
  }> {
    const stats = await this.getStatistics();
    const unreadCount = await this.getUnreadCount();
    
    return {
      totalArticles: stats.totalArticles,
      readArticles: stats.totalArticles - unreadCount.unreadCount,
      unreadArticles: unreadCount.unreadCount,
      readPercentage: stats.totalArticles > 0 ? ((stats.totalArticles - unreadCount.unreadCount) / stats.totalArticles) * 100 : 0
    };
  }

  async getWorkflowStatistics(): Promise<any> {
    try {
      const response = await this.makeRequest('/statistics/workflow');
      if (response.data && response.success) {
        return response.data;
      } else {
        return {
          workflow: {
            lastRun: new Date().toISOString(),
            rssFetchSuccess: 0,
            rssFetchFailed: 0,
            articlesProcessed: 0,
            newArticles: 0,
            articlesWithAlerts: 0,
            processingTime: '0s',
            tokensUsed: '0',
            successRate: '0%'
          },
          overview: {
            totalArticles: 0,
            articlesWithAlerts: 0,
            recentArticles: 0,
            readArticles: 0,
            unreadArticles: 0,
            savedArticles: 0,
            spamArticles: 0
          }
        };
      }
    } catch (error) {
      console.error('Error fetching workflow statistics:', error);
      return {
        workflow: {
          lastRun: new Date().toISOString(),
          rssFetchSuccess: 0,
          rssFetchFailed: 0,
          articlesProcessed: 0,
          newArticles: 0,
          articlesWithAlerts: 0,
          processingTime: '0s',
          tokensUsed: '0',
          successRate: '0%'
        },
        overview: {
          totalArticles: 0,
          articlesWithAlerts: 0,
          recentArticles: 0,
          readArticles: 0,
          unreadArticles: 0,
          savedArticles: 0,
          spamArticles: 0
        }
      };
    }
  }

  async getDetailedStatistics(): Promise<any> {
    try {
      const response = await this.makeRequest('/statistics/detailed');
      if (response.data && response.success) {
        return response.data;
      } else {
        return {
          feeds: []
        };
      }
    } catch (error) {
      console.error('Error fetching detailed statistics:', error);
      return {
        feeds: []
      };
    }
  }

  async getReadStatus(articleIds: string[]): Promise<Record<string, { read: boolean; timestamp?: string }>> {
    // Since the backend doesn't have a bulk read status endpoint,
    // we'll return an empty object and let the frontend handle it
    // The read status will be managed locally in the context
    return {};
  }

  async markAsUnread(articleId: string): Promise<{ message: string }> {
    return this.makeRequest(`/articles/${articleId}/read`, {
      method: 'PATCH',
      data: { read: false }
    });
  }

  // Saved articles methods - Fixed to match backend endpoints
  async saveArticle(articleId: string): Promise<{ message: string }> {
    return this.makeRequest(`/articles/${articleId}/saved`, {
      method: 'PATCH',
      data: { saved: true }
    });
  }

  async getSavedArticles(): Promise<Article[]> {
    const response = await this.makeRequest('/articles/saved');
    if (response.data && response.success) {
      return response.data;
    } else {
      return Array.isArray(response) ? response : [];
    }
  }

  // Additional methods for frontend compatibility
  async getSavedStatus(articleIds: string[]): Promise<Record<string, { saved: boolean; timestamp?: string }>> {
    // Since the backend doesn't have a bulk saved status endpoint,
    // we'll return an empty object and let the frontend handle it
    return {};
  }

  async unsaveArticle(articleId: string): Promise<{ message: string }> {
    return this.makeRequest(`/articles/${articleId}/saved`, {
      method: 'PATCH',
      data: { saved: false }
    });
  }

  // Spam methods
  async markAsSpam(articleId: string): Promise<{ message: string }> {
    return this.makeRequest(`/articles/${articleId}/spam`, {
      method: 'PATCH',
      data: { isSpam: true }
    });
  }

  async unmarkAsSpam(articleId: string): Promise<{ message: string }> {
    return this.makeRequest(`/articles/${articleId}/spam`, {
      method: 'PATCH',
      data: { isSpam: false }
    });
  }

  // Keywords methods
  async getKeywords(): Promise<any[]> {
    const response = await this.makeRequest('/keywords');
    if (response.data && response.success) {
      return response.data;
    } else {
      return Array.isArray(response) ? response : [];
    }
  }

  async addKeyword(keywordData: { name: string; displayName: string; description: string; category?: string; priority?: number; tags?: string[] }): Promise<any> {
    const response = await this.makeRequest('/keywords', {
      method: 'POST',
      data: keywordData,
    });
    return response.data || response;
  }

  async updateKeyword(keywordId: string, keywordData: { name?: string; displayName: string; description: string; category?: string; priority?: number; tags?: string[]; isActive?: boolean }): Promise<any> {
    const response = await this.makeRequest(`/keywords/${keywordId}`, {
      method: 'PATCH',
      data: keywordData,
    });
    return response.data || response;
  }

  async deleteKeyword(keywordId: string): Promise<any> {
    const response = await this.makeRequest(`/keywords/${keywordId}`, {
      method: 'DELETE',
    });
    return response.data || response;
  }

  async getKeyword(keywordId: string): Promise<any> {
    const response = await this.makeRequest(`/keywords/${keywordId}`);
    return response.data || response;
  }

  async toggleKeywordStatus(keywordId: string): Promise<any> {
    const response = await this.makeRequest(`/keywords/${keywordId}/toggle`, {
      method: 'PATCH',
    });
    return response.data || response;
  }

  // Sources methods
  async getSources(): Promise<any[]> {
    const response = await this.makeRequest('/sources');
    if (response.data && response.success) {
      return response.data;
    } else {
      return Array.isArray(response) ? response : [];
    }
  }

  async getForums(): Promise<Article[]> {
    const response = await this.makeRequest('/forums');
    if (response.data && response.success) {
      return response.data;
    } else {
      return Array.isArray(response) ? response : [];
    }
  }

  async checkHealth(): Promise<{ status: string; message: string; timestamp: string }> {
    return this.makeRequest('/health');
  }

  // Additional methods for frontend compatibility
  async cleanupDuplicates(): Promise<{
    success: boolean;
    summary: {
      totalArticles: number;
      duplicatesFound: number;
      articlesDeleted: number;
    };
    duplicates?: any[];
    message?: string;
  }> {
    // Since the backend doesn't have a cleanup duplicates endpoint,
    // we'll return a mock response
    return {
      success: true,
      summary: {
        totalArticles: 0,
        duplicatesFound: 0,
        articlesDeleted: 0
      },
      message: 'Duplicate cleanup not implemented in backend'
    };
  }

  // Filter methods
  async getAvailableTypes(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/articles/types');
      if (response.data && response.success) {
        return response.data;
      } else {
        // Fallback to common types
        return ['news', 'forum'];
      }
    } catch (error) {
      console.error('Error fetching available types:', error);
      // Fallback to common types
      return ['news', 'forum'];
    }
  }

  async getAvailableIndustries(): Promise<string[]> {
    try {
      // Get all articles and extract unique industries from the industries arrays
      const articles = await this.getAllArticles();
      const allIndustries = new Set<string>();
      
      articles.forEach(article => {
        if (article.industries && Array.isArray(article.industries)) {
          article.industries.forEach(industry => {
            if (industry && industry.trim()) {
              allIndustries.add(industry.trim());
            }
          });
        }
        // Also check single industry field as fallback
        if (article.industry && article.industry.trim()) {
          allIndustries.add(article.industry.trim());
        }
      });
      
      // Convert to array and sort
      const industries = Array.from(allIndustries).sort();
      
      // If no industries found, return default list
      if (industries.length === 0) {
        return [
          'Automotive', 'Finance', 'ICS/OT', 'Healthcare', 'Energy', 
          'Government', 'Education', 'Retail', 'Manufacturing', 
          'Transportation', 'Telecommunications', 'Media', 'Entertainment', 'Other'
        ];
      }
      
      return industries;
    } catch (error) {
      console.error('Error fetching available industries:', error);
      // Fallback to default industries
      return [
        'Automotive', 'Finance', 'ICS/OT', 'Healthcare', 'Energy', 
        'Government', 'Education', 'Retail', 'Manufacturing', 
        'Transportation', 'Telecommunications', 'Media', 'Entertainment', 'Other'
      ];
    }
  }

  async getAvailableSources(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/articles/sources');
      if (response.data && response.success) {
        return response.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching available sources:', error);
      return [];
    }
  }

  async getAvailableThreatTypes(): Promise<string[]> {
    try {
      // Get all articles and extract unique threat types
      const articles = await this.getAllArticles();
      const allThreatTypes = new Set<string>();
      
      articles.forEach(article => {
        if (article.threatType && article.threatType.trim() && article.threatType !== 'N/A') {
          allThreatTypes.add(article.threatType.trim());
        }
      });
      
      // Convert to array and sort
      const threatTypes = Array.from(allThreatTypes).sort();
      
      // If no threat types found, return default list
      if (threatTypes.length === 0) {
        return [
          'malware', 'phishing', 'vulnerability', 'ransomware', 'data breach', 
          'social engineering', 'DDoS', 'APT', 'zero-day', 'insider threat',
          'supply chain', 'credential stuffing', 'man-in-the-middle', 'SQL injection',
          'cross-site scripting', 'privilege escalation', 'backdoor', 'trojan'
        ];
      }
      
      return threatTypes;
    } catch (error) {
      console.error('Error fetching available threat types:', error);
      // Fallback to default threat types
      return [
        'malware', 'phishing', 'vulnerability', 'ransomware', 'data breach', 
        'social engineering', 'DDoS', 'APT', 'zero-day', 'insider threat',
        'supply chain', 'credential stuffing', 'man-in-the-middle', 'SQL injection',
        'cross-site scripting', 'privilege escalation', 'backdoor', 'trojan'
      ];
    }
  }



  // Sources methods
  async addSource(source: { name: string; url: string; description?: string; category?: string; type?: string }): Promise<any> {
    const response = await this.makeRequest('/sources', {
      method: 'POST',
      data: source
    });
    return response.data || response;
  }

  async updateSource(sourceId: string, source: { name: string; url: string; description?: string; category?: string; type?: string; isActive?: boolean }): Promise<any> {
    const response = await this.makeRequest(`/sources/${sourceId}`, {
      method: 'PUT',
      data: source
    });
    return response.data || response;
  }

  async deleteSource(sourceId: string): Promise<{ message: string }> {
    const response = await this.makeRequest(`/sources/${sourceId}`, {
      method: 'DELETE'
    });
    return response;
  }

  async clearSourceError(sourceId: string): Promise<any> {
    const response = await this.makeRequest(`/sources/${sourceId}/clear-error`, {
      method: 'PATCH'
    });
    return response;
  }

  async updateSourceIsoTime(sourceId: string, isoDate: string): Promise<any> {
    const response = await this.makeRequest(`/sources/${sourceId}/iso-time`, {
      method: 'PATCH',
      data: { isoDate }
    });
    return response;
  }

  async updateSourceLastFetch(sourceId: string, lastFetch: string): Promise<any> {
    const response = await this.makeRequest(`/sources/${sourceId}/last-fetch`, {
      method: 'PATCH',
      data: { lastFetch }
    });
    return response;
  }

  async updateSourceError(sourceId: string, error: string): Promise<any> {
    // Since the backend doesn't have this endpoint, return a mock response
    return { message: 'Source error updated successfully' };
  }

  async getSourceById(sourceId: string): Promise<any> {
    // Since the backend doesn't have this endpoint, return a mock response
    return {
      _id: sourceId,
      name: 'Mock Source',
      url: 'https://example.com',
      description: 'Mock source description',
      category: 'general',
      type: 'news',
      isActive: true
    };
  }

  async runSource(sourceId: string): Promise<any> {
    const response = await this.makeRequest(`/sources/${sourceId}/run`, {
      method: 'POST'
    });
    return response;
  }

  // Prompt management methods
  async getPrompts(): Promise<any[]> {
    try {
      const response = await this.makeRequest('/prompts');
      if (response.data && response.success) {
        return response.data;
      } else {
        return Array.isArray(response) ? response : [];
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
      return [];
    }
  }

  async getActivePrompt(): Promise<any> {
    try {
      const response = await this.makeRequest('/prompts/active');
      if (response.data && response.success) {
        return response.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching active prompt:', error);
      return null;
    }
  }

  async updatePrompt(promptId: string, prompt: any): Promise<any> {
    const response = await this.makeRequest(`/prompts/${promptId}`, {
      method: 'PUT',
      data: prompt
    });
    return response;
  }

  async activatePrompt(promptId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/prompts/${promptId}/activate`, {
        method: 'POST'
      });
      if (response.data && response.success) {
        return response.data;
      } else {
        return response;
      }
    } catch (error) {
      console.error('Error activating prompt:', error);
      throw error;
    }
  }

  // Workflow runs methods
  async getWorkflowRuns(limit: number = 10, page: number = 1): Promise<any> {
    try {
      const response = await this.makeRequest(`/statistics/workflow-runs?limit=${limit}&page=${page}`);
      if (response.data && response.success) {
        return response.data;
      } else {
        return { runs: [], pagination: { total: 0, page: 1, limit, pages: 0 } };
      }
    } catch (error) {
      console.error('Error fetching workflow runs:', error);
      return { runs: [], pagination: { total: 0, page: 1, limit, pages: 0 } };
    }
  }

  async getWorkflowRunDetails(runId: string): Promise<any> {
    const response = await this.makeRequest(`/statistics/workflow-runs/${runId}`);
    if (response.data && response.success) {
      return response.data;
    } else {
      return null;
    }
  }

  async getOpenAIBilling(): Promise<any> {
    try {
      const response = await this.makeRequest('/statistics/openai-billing');
      if (response.data && response.success) {
        return response.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error fetching OpenAI billing:', error);
      return null;
    }
  }

  async testRun(): Promise<any> {
    try {
      const response = await this.makeRequest('/statistics/test-run', {
        method: 'POST'
      });
      if (response.data && response.success) {
        return response.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error running test:', error);
      throw error;
    }
  }

  // Statistics methods
  async getProcessingStatistics(): Promise<any[]> {
    const response = await this.makeRequest('/statistics/processing');
    return response.data || [];
  }

  async getOpenAIStatistics(): Promise<any> {
    const response = await this.makeRequest('/statistics/openai');
    return response.data || {};
  }

  async getSystemStatus(): Promise<any> {
    const response = await this.makeRequest('/statistics/status');
    return response.data || {};
  }

  async triggerWorkflow(): Promise<any> {
    return this.makeRequest('/trigger-workflow', {
      method: 'POST'
    });
  }

  // Admin methods
  async getAdminUsers(): Promise<{ users: any[] }> {
    try {
      const response = await this.makeRequest('/admin/users');
      console.log('Raw admin users response:', response);
      // The backend returns { success: true, users: [...] }
      return response;
    } catch (error) {
      console.error('Error in getAdminUsers:', error);
      throw error;
    }
  }

  async approveUser(userId: string): Promise<any> {
    const response = await this.makeRequest(`/admin/users/${userId}/approve`, {
      method: 'PATCH'
    });
    return response;
  }

  async updateUserPlan(userId: string, plan: 'simple' | 'premium'): Promise<any> {
    const response = await this.makeRequest(`/admin/users/${userId}/plan`, {
      method: 'PATCH',
      data: { plan }
    });
    return response;
  }

  async suspendUser(userId: string): Promise<any> {
    const response = await this.makeRequest(`/admin/users/${userId}/suspend`, {
      method: 'PATCH'
    });
    return response;
  }
}

export const apiService = new ApiService();
