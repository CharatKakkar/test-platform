// src/services/authService.js
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updateProfile
  } from 'firebase/auth';
  import { auth, db } from '../firebase';
  import { doc, setDoc, getDoc } from 'firebase/firestore';
  
  // Register a new user
  export const registerUser = async (name, email, password) => {
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with name
      await updateProfile(user, {
        displayName: name
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        createdAt: new Date(),
      });
      
      // Return user data
      return {
        id: user.uid,
        name: user.displayName,
        email: user.email
      };
    } catch (error) {
      throw new Error(error.message);
    }
  };
  
  // Login a user
  export const loginUser = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get additional user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      
      return {
        id: user.uid,
        name: user.displayName || userData.name,
        email: user.email
      };
    } catch (error) {
      throw new Error(error.message);
    }
  };
  
  // Logout a user
  export const logoutUser = async () => {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  };
  
  // Get current user data
  export const getCurrentUser = async () => {
    const user = auth.currentUser;
    if (!user) return null;
    
    // Get additional user data from Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const userData = userDoc.data();
    
    return {
      id: user.uid,
      name: user.displayName || userData?.name,
      email: user.email
    };
  };