import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiService } from '../services/api';

interface SavedArticlesContextType {
  savedStatus: Record<string, { saved: boolean; timestamp?: string }>;
  saveArticle: (articleId: string) => Promise<void>;
  unsaveArticle: (articleId: string) => Promise<void>;
  saveAllArticles: (articleIds: string[]) => Promise<void>;
  isSaved: (articleId: string) => boolean;
  refreshSavedStatus: (articleIds: string[]) => Promise<void>;
  getSavedArticles: () => Promise<any[]>;
}

const SavedArticlesContext = createContext<SavedArticlesContextType | undefined>(undefined);

export const useSavedArticles = () => {
  const context = useContext(SavedArticlesContext);
  if (context === undefined) {
    throw new Error('useSavedArticles must be used within a SavedArticlesProvider');
  }
  return context;
};

interface SavedArticlesProviderProps {
  children: ReactNode;
}

export const SavedArticlesProvider: React.FC<SavedArticlesProviderProps> = ({ children }) => {
  const [savedStatus, setSavedStatus] = useState<Record<string, { saved: boolean; timestamp?: string }>>({});

  const saveArticle = async (articleId: string) => {
    try {
      console.log('Saving article:', articleId);
      const result = await apiService.saveArticle(articleId);
      console.log('Save article result:', result);
      setSavedStatus(prev => ({
        ...prev,
        [articleId]: { saved: true, timestamp: new Date().toISOString() }
      }));
      
      // Show success feedback
      console.log('✅ Article saved successfully! Check the "Saved Articles" page to view saved articles.');
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('articleSaved', { detail: { articleId } }));
    } catch (error) {
      console.error('Error saving article:', error);
      alert('Failed to save article. Please try again.');
    }
  };

  const unsaveArticle = async (articleId: string) => {
    try {
      console.log('Unsaving article:', articleId);
      const result = await apiService.unsaveArticle(articleId);
      console.log('Unsave article result:', result);
      setSavedStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[articleId];
        return newStatus;
      });
      
      // Show success feedback
      console.log('✅ Article removed from saved articles.');
      
      // Trigger a custom event to notify other components
      window.dispatchEvent(new CustomEvent('articleUnsaved', { detail: { articleId } }));
    } catch (error) {
      console.error('Error unsaving article:', error);
              alert('Failed to remove article from saved articles. Please try again.');
    }
  };

  const saveAllArticles = async (articleIds: string[]) => {
    try {
      console.log('Saving all articles:', articleIds.length);
      // Since the backend doesn't have a bulk save endpoint,
      // we'll save articles one by one
      for (const articleId of articleIds) {
        await apiService.saveArticle(articleId);
      }
      
      // Update local state
      const newSavedStatus: Record<string, { saved: boolean; timestamp?: string }> = {};
      articleIds.forEach(articleId => {
        newSavedStatus[articleId] = { saved: true, timestamp: new Date().toISOString() };
      });
      
      setSavedStatus(prev => ({
        ...prev,
        ...newSavedStatus
      }));
      
      console.log('All articles saved successfully');
    } catch (error) {
      console.error('Error saving all articles:', error);
      throw error; // Re-throw to allow error handling in components
    }
  };

  const isSaved = (articleId: string) => {
    return savedStatus[articleId]?.saved || false;
  };

  const getSavedArticles = async () => {
    return await apiService.getSavedArticles();
  };

  const refreshSavedStatus = async (articleIds: string[]) => {
    try {
      // Since the backend doesn't have a bulk saved status endpoint,
      // we'll just return and let the frontend manage saved status locally
      // The saved status will be updated when articles are saved/unsaved
      console.log('Refreshing saved status for', articleIds.length, 'articles');
    } catch (error) {
      console.error('Error refreshing saved status:', error);
    }
  };

  return (
    <SavedArticlesContext.Provider value={{
      savedStatus,
      saveArticle,
      unsaveArticle,
      saveAllArticles,
      isSaved,
      refreshSavedStatus,
      getSavedArticles,
    }}>
      {children}
    </SavedArticlesContext.Provider>
  );
}; 