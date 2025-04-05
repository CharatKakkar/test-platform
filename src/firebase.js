// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// Replace with your actual Firebase config details from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCaJwQjKS-LJroKl5ARYrWzTyOFuIz74Bc",
  authDomain: "testpro-3f16c.firebaseapp.com",
  projectId: "testpro-3f16c",
  storageBucket: "testpro-3f16c.firebasestorage.app",
  messagingSenderId: "31282698059",
  appId: "1:31282698059:web:da28815fa922d1b553bace",
  measurementId: "G-RSED5CBJT6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };