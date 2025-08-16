
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChangedHelper, signOut as signOutFirebase } from '@/lib/firebase/auth';
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

  const fetchUserProfile = useCallback(async (userAuth: User) => {
    let userProfile = await getUserProfile(userAuth.uid);
        
    // This logic ensures every user has a complete profile.
    if (!userProfile) {
      // 1. If profile doesn't exist at all, create it.
      // This handles first-time Google sign-ins or new registrations.
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
      // 2. If profile exists but is missing a username (from old data structure)
      // update it with a generated username.
      const fallbackUsername = userAuth.displayName || userProfile.email?.split('@')[0] || `user${Date.now().toString().slice(-4)}`;
      userProfile.username = fallbackUsername;
      await updateUserProfile(userAuth.uid, { username: fallbackUsername });
    }
    
    setProfile(userProfile);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper(async (userAuth) => {
      setLoading(true);
      if (userAuth) {
        setUser(userAuth);
        await fetchUserProfile(userAuth);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserProfile]);
  
  const signOut = async () => {
    await signOutFirebase();
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
