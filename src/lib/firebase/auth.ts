
"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as signOutFirebase,
  onAuthStateChanged,
  type User,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { createUserProfile } from './firestore';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      const username = user.email?.split('@')[0] || `user${Math.floor(Math.random() * 10000)}`;
      await createUserProfile({
        uid: user.uid,
        username: user.displayName || username,
        email: user.email || '',
        photoURL: user.photoURL,
      });
    }
    return { result, error: null };
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    return { result: null, error };
  }
};

export const signUp = async (username: string, email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    // Update Firebase Auth profile
    await updateProfile(user, { displayName: username });

    // Create user profile in Firestore
    await createUserProfile({
        uid: user.uid,
        username: username,
        email: email,
        photoURL: null,
    });
    return { result, error: null };
  } catch (error) {
    return { result: null, error };
  }
};

export const signIn = async (identifier: string, password: string) => {
  try {
    let email = identifier;
    // Check if identifier is a username or an email
    if (!identifier.includes('@')) {
      const res = await fetch(`/api/users?username=${identifier}`);
      const data = await res.json();
      if (data.exists) {
        email = data.email;
      } else {
        throw new Error("User not found.");
      }
    }
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { result, error: null };
  } catch (error) {
    return { result: null, error };
  }
};

export const signOut = () => {
  return signOutFirebase(auth);
};

export const onAuthStateChangedHelper = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
