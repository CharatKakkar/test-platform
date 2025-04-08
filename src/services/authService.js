// src/services/authService.js
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    updateProfile,
    signInWithPopup,
    GoogleAuthProvider
  } from 'firebase/auth';
  import { auth, db } from '../firebase';
  import { doc, setDoc, getDoc } from 'firebase/firestore';
 // import { mergeCartOnLogin } from './cartService';
  
  // Register with email and password
  export const registerWithEmail = async (name, email, password) => {
    try {
      // Validate email format
      if (!email || typeof email !== 'string') {
        throw new Error('Please provide a valid email address');
      }
      
      const trimmedEmail = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error('Please enter a valid email address');
      }
      
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;
      
      // Update profile with name
      await updateProfile(user, {
        displayName: name
      });
      
      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        email: trimmedEmail,
        createdAt: new Date(),
      });
      
      // Merge any cart items from localStorage
      //await mergeCartOnLogin(user.uid);
      
      // Return user data
      return {
        id: user.uid,
        name: user.displayName,
        email: user.email
      };
    } catch (error) {
      console.error("Email registration error:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please login instead.');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('The email address format is invalid. Please check and try again.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please use a stronger password.');
      } else {
        throw new Error(error.details || 'Registration failed');
      }
    }
  };
  
  // Login with email and password
  export const loginWithEmail = async (email, password) => {
    try {
      // Validate email
      if (!email || typeof email !== 'string') {
        throw new Error('Please provide a valid email address');
      }
      
      // Trim and validate email format
      const trimmedEmail = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error('Please enter a valid email address');
      }
      
      // Regular email/password login
      const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      const user = userCredential.user;
      
      // Get additional user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      
      // Merge any cart items from localStorage
     // await mergeCartOnLogin(user.uid);
      
      return {
        id: user.uid,
        name: user.displayName || userData?.name,
        email: user.email
      };
    } catch (error) {
      console.error("Email login error:", error);
      
      // Enhance error messages for better user feedback
      if (error.code === 'auth/invalid-email') {
        throw new Error('The email address format is invalid. Please check and try again.');
      } else if (error.code === 'auth/user-not-found') {
        throw new Error('No account found with this email. Please check your email or register.');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Incorrect password. Please try again or reset your password.');
      } else {
        throw new Error(error.message || 'Login failed. Please try again.');
      }
    }
  };
  
  
export const authenticateWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create user data object
      const userData = {
        id: user.uid,
        name: user.displayName || 'Google User',
        email: user.email
      };
      
      // Verify user is still authenticated
      if (auth.currentUser) {
        console.log("User is authenticated:", auth.currentUser.uid);
        
        try {
          const userDocRef = doc(db, "users", user.uid);
          await setDoc(userDocRef, {
            name: user.displayName || 'Google User',
            email: user.email,
            createdAt: new Date(),
          }, { merge: true });
        } catch (firestoreError) {
          console.error("Firestore error:", firestoreError);
        }
      } else {
        console.error("User is not authenticated when attempting Firestore operations");
      }
      
      return userData;
    } catch (error) {
      console.error("Google auth error:", error);
      throw new Error(error.message || 'Google authentication failed');
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