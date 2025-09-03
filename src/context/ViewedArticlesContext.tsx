import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ViewedArticlesContextType {
  viewedArticles: Set<string>;
  markAsViewed: (articleId: string) => void;
  isViewed: (articleId: string) => boolean;
  clearViewedArticles: () => void;
}

const ViewedArticlesContext = createContext<ViewedArticlesContextType | undefined>(undefined);

export const useViewedArticles = () => {
  const context = useContext(ViewedArticlesContext);
  if (context === undefined) {
    throw new Error('useViewedArticles must be used within a ViewedArticlesProvider');
  }
  return context;
};

interface ViewedArticlesProviderProps {
  children: ReactNode;
}

export const ViewedArticlesProvider: React.FC<ViewedArticlesProviderProps> = ({ children }) => {
  const [viewedArticles, setViewedArticles] = useState<Set<string>>(new Set());

  // Load viewed articles from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('viewedArticles');
    if (saved) {
      try {
        const viewedArray = JSON.parse(saved);
        setViewedArticles(new Set(viewedArray));
      } catch (error) {
        console.error('Error loading viewed articles:', error);
      }
    }
  }, []);

  // Save viewed articles to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('viewedArticles', JSON.stringify(Array.from(viewedArticles)));
  }, [viewedArticles]);

  const markAsViewed = (articleId: string) => {
    setViewedArticles(prev => new Set(Array.from(prev).concat(articleId)));
  };

  const isViewed = (articleId: string) => {
    return viewedArticles.has(articleId);
  };

  const clearViewedArticles = () => {
    setViewedArticles(new Set());
  };

  const value: ViewedArticlesContextType = {
    viewedArticles,
    markAsViewed,
    isViewed,
    clearViewedArticles,
  };

  return (
    <ViewedArticlesContext.Provider value={value}>
      {children}
    </ViewedArticlesContext.Provider>
  );
}; 