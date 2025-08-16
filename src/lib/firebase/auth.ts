
"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as signOutFirebase,
  onAuthStateChanged,
  type User,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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
      await createUserProfile({
        uid: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Anonymous',
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

export const signUp = async (name: string, email, password) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    await createUserProfile({
        uid: user.uid,
        name: name,
        email: email,
        photoURL: null, // Default photoURL for email sign-up
    });
    return { result, error: null };
  } catch (error) {
    return { result: null, error };
  }
};

export const signIn = async (email, password) => {
  try {
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
