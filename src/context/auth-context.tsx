"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChangedHelper, signOut as signOutFirebase, handleRedirectResult } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for redirect result on initial load
    handleRedirectResult().then(({ error }) => {
      if (error) {
        console.error("Google Sign-In failed", error);
      }
    });

    const unsubscribe = onAuthStateChangedHelper((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);
  
  const signOut = async () => {
    await signOutFirebase();
    setUser(null);
    router.push('/');
  };

  const value = { user, loading, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
