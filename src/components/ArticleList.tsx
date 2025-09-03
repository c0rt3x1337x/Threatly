import React from 'react';
import ArticleCard from './ArticleCard';
import { Article } from '../types/Article';
import { useReadStatus } from '../context/ReadStatusContext';
import { apiService } from '../services/api';

interface ArticleListProps {
  articles: Article[];
  loading: boolean;
  onDelete?: (articleId: string) => void;
  keywords?: Record<string, { name: string; displayName: string }>;
  isAdmin?: boolean;
}

const ArticleList: React.FC<ArticleListProps> = ({ articles, loading, onDelete, keywords = {}, isAdmin = false }) => {
  const { isRead, markAsRead, markAsUnread } = useReadStatus();

  const handleMarkAsRead = async (articleId: string) => {
    try {
      const currentReadStatus = isRead(articleId);
      if (currentReadStatus) {
        await markAsUnread(articleId);
      } else {
        await markAsRead(articleId);
      }
    } catch (error) {
      console.error('Error toggling read status:', error);
    }
  };

  const handleSpamToggle = async (articleId: string) => {
    try {
      // For now, just mark as spam since we don't have a way to check current spam status
      await apiService.markAsSpam(articleId);
      // Optionally refresh the article list or show a success message
      console.log('Article marked as spam');
    } catch (error) {
      console.error('Error marking article as spam:', error);
      alert('Error: Failed to mark article as spam. Please try again.');
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    console.log('Delete clicked for article:', articleId);
    
    if (!window.confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
      console.log('Delete cancelled by user');
      return;
    }

    try {
      console.log('Deleting article...');
      await apiService.deleteArticle(articleId);
      console.log('Article deleted successfully');
      
      if (onDelete) {
        onDelete(articleId);
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Error: Failed to delete article. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading articles...</span>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No articles found</h3>
        <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters to find what you're looking for.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {articles.map((article) => (
        <ArticleCard 
          key={article._id} 
          article={article} 
          onReadToggle={handleMarkAsRead}
          onSpamToggle={handleSpamToggle}
          onDelete={handleDeleteArticle}
          isRead={isRead(article._id)}
          keywords={keywords}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
};

export default ArticleList; 