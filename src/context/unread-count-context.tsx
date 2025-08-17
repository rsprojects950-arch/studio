
'use client';

import React, { createContext, useContext } from 'react';

type UnreadCountContextType = {
  resetUnreadCount?: (conversationId?: string) => void;
};

const UnreadCountContext = createContext<UnreadCountContextType>({});

export const UnreadCountProvider = ({ children, value }: { children: React.ReactNode, value: UnreadCountContextType }) => {
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
