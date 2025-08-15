import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as signOutFirebase,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export const signUp = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => ({ result: userCredential, error: null }))
    .catch((error) => ({ result: null, error }));
};

export const signIn = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => ({ result: userCredential, error: null }))
    .catch((error) => ({ result: null, error }));
};

export const signOut = () => {
  return signOutFirebase(auth);
};

export const onAuthStateChangedHelper = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
