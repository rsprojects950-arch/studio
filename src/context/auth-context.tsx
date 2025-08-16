
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChangedHelper, signOut as signOutFirebase } from '@/lib/firebase/auth';
import { useRouter } from 'next/navigation';
import { getUserProfile, createUserProfile } from '@/lib/firebase/firestore';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper(async (userAuth) => {
      setLoading(true);
      if (userAuth) {
        setUser(userAuth);
        let userProfile = await getUserProfile(userAuth.uid);
        if (!userProfile) {
          // If profile doesn't exist, create it. This handles first-time Google sign-ins
          const newUsername = userAuth.email?.split('@')[0] || `user${Math.floor(Math.random() * 10000)}`;
          const newProfileData: UserProfile = {
            uid: userAuth.uid,
            username: userAuth.displayName || newUsername,
            email: userAuth.email || '',
            photoURL: userAuth.photoURL || null,
          };
          await createUserProfile(newProfileData);
          userProfile = newProfileData;
        }
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
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
