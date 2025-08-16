
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut as signOutFirebase } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getUserProfile, createUserProfile, updateUserProfile } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/lib/types';


type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleUserChange = useCallback(async (userAuth: User | null) => {
    setLoading(true);
    if (userAuth) {
      setUser(userAuth);
      
      let userProfile = await getUserProfile(userAuth.uid);
      
      if (!userProfile) {
        const newUsername = userAuth.displayName || userAuth.email?.split('@')[0] || `user${Date.now().toString().slice(-4)}`;
        const newProfileData: UserProfile = {
          uid: userAuth.uid,
          username: newUsername,
          email: userAuth.email || '',
          photoURL: userAuth.photoURL || null,
        };
        await createUserProfile(newProfileData);
        userProfile = newProfileData;
      } else if (!userProfile.username) {
        const fallbackUsername = userAuth.displayName || userProfile.email?.split('@')[0] || `user${Date.now().toString().slice(-4)}`;
        userProfile.username = fallbackUsername;
        await updateUserProfile(userAuth.uid, { username: fallbackUsername });
      }
      
      setProfile(userProfile);
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, handleUserChange);
    return () => unsubscribe();
  }, [handleUserChange]);
  
  const signOut = async () => {
    await signOutFirebase(auth);
    setUser(null);
    setProfile(null);
    router.push('/');
  };

  const value = { user, profile, loading, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
