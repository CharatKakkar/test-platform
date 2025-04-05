// src/services/profileService.js
import { db, auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Get the current user's profile data
export const getUserProfile = async (userId = null) => {
  try {
    // If no userId specified, use the currently authenticated user
    const user = auth.currentUser;
    const uid = userId || user?.uid;
    
    if (!uid) {
      throw new Error('No user is currently authenticated');
    }
    
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (userDoc.exists()) {
      return userDoc.data();
    } else {
      throw new Error('User profile not found');
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// Update user profile data
export const updateUserProfile = async (profileData) => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user is currently authenticated');
    }
    
    // Update auth display name if name is provided
    if (profileData.name) {
      await updateProfile(user, {
        displayName: profileData.name
      });
    }
    
    // Update user document in Firestore
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: new Date()
    });
    
    return {
      id: user.uid,
      name: user.displayName,
      email: user.email,
      ...profileData
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Create or update user preferences
export const updateUserPreferences = async (preferences) => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user is currently authenticated');
    }
    
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // Update existing preferences
      await updateDoc(userRef, {
        preferences: {
          ...userDoc.data().preferences,
          ...preferences
        },
        updatedAt: new Date()
      });
    } else {
      // Create new user document with preferences
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        preferences: preferences,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return preferences;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
};

// Get user's purchased exams
export const getUserPurchasedExams = async () => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return [];
    }
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (userDoc.exists() && userDoc.data().purchasedExams) {
      return userDoc.data().purchasedExams;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error getting purchased exams:', error);
    return [];
  }
};

// Add purchased exams to user profile
export const addPurchasedExams = async (examIds) => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No user is currently authenticated');
    }
    
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentPurchases = userDoc.data().purchasedExams || [];
      // Add unique exams only
      const updatedPurchases = [...new Set([...currentPurchases, ...examIds])];
      
      await updateDoc(userRef, {
        purchasedExams: updatedPurchases,
        updatedAt: new Date()
      });
      
      return updatedPurchases;
    } else {
      // Create new user document with purchased exams
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        purchasedExams: examIds,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return examIds;
    }
  } catch (error) {
    console.error('Error adding purchased exams:', error);
    throw error;
  }
};