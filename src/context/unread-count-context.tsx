
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';

type UnreadCountContextType = {
  totalUnreadCount: number;
  refreshUnreadCount: () => void;
};

const UnreadCountContext = createContext<UnreadCountContextType>({
    totalUnreadCount: 0,
    refreshUnreadCount: () => {}
});

export const UnreadCountProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
        setTotalUnreadCount(0);
        return;
    };
    try {
      const response = await fetch(`/api/unread?userId=${user.uid}`);
      if (response.ok) {
        const data = await response.json();
        setTotalUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
      setTotalUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    refreshUnreadCount();
    // Poll for new unread messages every 15 seconds
    const interval = setInterval(refreshUnreadCount, 15000); 
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  const value = { totalUnreadCount, refreshUnreadCount };

  return (
    <UnreadCountContext.Provider value={value}>
      {children}
    </UnreadCountContext.Provider>
  );
};

export const useUnreadCount = () => {
  const context = useContext(UnreadCountContext);
  if (context === undefined) {
    throw new Error('useUnreadCount must be used within an UnreadCountProvider');
  }
  return context;
};
