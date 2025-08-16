
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  "projectId": "beyond-theory-nnj8t",
  "appId": "1:802409678105:web:398aeeac8f9df7873b3188",
  "storageBucket": "beyond-theory-nnj8t.appspot.com",
  "apiKey": "AIzaSyB0arME69fy4Aa0HQf8xSvdmr84VSiFvp4",
  "authDomain": "beyond-theory-nnj8t.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "802409678105"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
