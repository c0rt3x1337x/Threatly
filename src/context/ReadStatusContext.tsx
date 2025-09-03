import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiService } from '../services/api';

interface ReadStatusContextType {
  readStatus: Record<string, { read: boolean; timestamp?: string }>;
  markAsRead: (articleId: string) => Promise<void>;
  markAsUnread: (articleId: string) => Promise<void>;
  markAllAsRead: (articleIds: string[]) => Promise<void>;
  isRead: (articleId: string) => boolean;
  getReadStats: () => Promise<{
    totalArticles: number;
    readArticles: number;
    unreadArticles: number;
    readPercentage: number;
  }>;
  refreshReadStatus: (articleIds: string[]) => Promise<void>;
}

const ReadStatusContext = createContext<ReadStatusContextType | undefined>(undefined);

export const useReadStatus = () => {
  const context = useContext(ReadStatusContext);
  if (context === undefined) {
    throw new Error('useReadStatus must be used within a ReadStatusProvider');
  }
  return context;
};

interface ReadStatusProviderProps {
  children: ReactNode;
}

export const ReadStatusProvider: React.FC<ReadStatusProviderProps> = ({ children }) => {
  const [readStatus, setReadStatus] = useState<Record<string, { read: boolean; timestamp?: string }>>({});

  const markAsRead = async (articleId: string) => {
    try {
      console.log('Marking article as read:', articleId);
      const result = await apiService.markAsRead(articleId);
      console.log('Mark as read result:', result);
      setReadStatus(prev => ({
        ...prev,
        [articleId]: { read: true, timestamp: new Date().toISOString() }
      }));
    } catch (error) {
      console.error('Error marking article as read:', error);
    }
  };

  const markAsUnread = async (articleId: string) => {
    try {
      console.log('Marking article as unread:', articleId);
      const result = await apiService.markAsUnread(articleId);
      console.log('Mark as unread result:', result);
      setReadStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[articleId];
        return newStatus;
      });
    } catch (error) {
      console.error('Error marking article as unread:', error);
    }
  };

  const isRead = (articleId: string) => {
    return readStatus[articleId]?.read || false;
  };

  const getReadStats = async () => {
    return await apiService.getReadStats();
  };

  const markAllAsRead = async (articleIds: string[]) => {
    try {
      console.log('Marking all articles as read:', articleIds.length);
      const result = await apiService.markAllAsRead();
      console.log('Mark all as read result:', result);
      
      // Update local state for all articles
      const newReadStatus: Record<string, { read: boolean; timestamp?: string }> = {};
      articleIds.forEach(articleId => {
        newReadStatus[articleId] = { read: true, timestamp: new Date().toISOString() };
      });
      
      setReadStatus(prev => ({
        ...prev,
        ...newReadStatus
      }));
      
      console.log('All articles marked as read successfully');
    } catch (error) {
      console.error('Error marking all articles as read:', error);
      throw error; // Re-throw to allow error handling in components
    }
  };

  const refreshReadStatus = async (articleIds: string[]) => {
    try {
      // Since the backend doesn't have a bulk read status endpoint,
      // we'll just return and let the frontend manage read status locally
      // The read status will be updated when articles are marked as read
      console.log('Refreshing read status for', articleIds.length, 'articles');
    } catch (error) {
      console.error('Error refreshing read status:', error);
    }
  };

  return (
    <ReadStatusContext.Provider value={{
      readStatus,
      markAsRead,
      markAsUnread,
      markAllAsRead,
      isRead,
      getReadStats,
      refreshReadStatus,
    }}>
      {children}
    </ReadStatusContext.Provider>
  );
}; 