// src/services/cartService.js
import { db, auth } from '../firebase';
import { 
  doc, 
  collection, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  deleteField 
} from 'firebase/firestore';

// Get the current user's cart
export const getCart = async () => {
  try {
    const user = auth.currentUser;
    
    // For non-authenticated users, get cart from localStorage
    if (!user) {
      const storedCart = localStorage.getItem('cart');
      return storedCart ? JSON.parse(storedCart) : [];
    }
    
    // Get cart from Firestore
    const cartDoc = await getDoc(doc(db, "carts", user.uid));
    
    if (cartDoc.exists()) {
      return cartDoc.data().items || [];
    } else {
      // Initialize empty cart if it doesn't exist
      await setDoc(doc(db, "carts", user.uid), { items: [] });
      return [];
    }
  } catch (error) {
    console.error("Error getting cart:", error);
    return [];
  }
};

// Add an item to the cart
export const addToCart = async (item) => {
  try {
    const user = auth.currentUser;
    
    // Ensure all exam data is preserved
    const cartItem = {
      ...item,
      category: item.category,
      price: parseFloat(item.price) || 0,
      quantity: item.quantity || 1
    };
    
    // For non-authenticated users, save to localStorage
    if (!user) {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      if (!cart.some(cartItem => cartItem.id === item.id)) {
        cart.push(cartItem);
        localStorage.setItem('cart', JSON.stringify(cart));
      }
      return cart;
    }
    
    // Check if cart exists
    const cartRef = doc(db, "carts", user.uid);
    const cartDoc = await getDoc(cartRef);
    
    if (cartDoc.exists()) {
      // Check if item already exists in cart
      const cartData = cartDoc.data();
      const existingItem = cartData.items.find(cartItem => cartItem.id === item.id);
      
      if (!existingItem) {
        // Add new item
        await updateDoc(cartRef, {
          items: arrayUnion(cartItem)
        });
      }
    } else {
      // Create new cart with the item
      await setDoc(cartRef, {
        items: [cartItem]
      });
    }
    
    // Return updated cart
    return getCart();
  } catch (error) {
    console.error("Error adding to cart:", error);
    throw error;
  }
};

// Remove an item from the cart
export const removeFromCart = async (itemId) => {
  try {
    const user = auth.currentUser;
    
    // For non-authenticated users, remove from localStorage
    if (!user) {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const updatedCart = cart.filter(item => item.id !== itemId);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      return updatedCart;
    }
    
    // Get current cart
    const cartRef = doc(db, "carts", user.uid);
    const cartDoc = await getDoc(cartRef);
    
    if (cartDoc.exists()) {
      const cartData = cartDoc.data();
      const itemToRemove = cartData.items.find(item => item.id === itemId);
      
      if (itemToRemove) {
        await updateDoc(cartRef, {
          items: arrayRemove(itemToRemove)
        });
      }
    }
    
    // Return updated cart
    return getCart();
  } catch (error) {
    console.error("Error removing from cart:", error);
    throw error;
  }
};

// Update item quantity in cart
export const updateCartItemQuantity = async (itemId, quantity) => {
  try {
    const user = auth.currentUser;
    
    // For non-authenticated users, update localStorage
    if (!user) {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const updatedCart = cart.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: Math.max(1, quantity) };
        }
        return item;
      });
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      return updatedCart;
    }
    
    // Get current cart
    const cartRef = doc(db, "carts", user.uid);
    const cartDoc = await getDoc(cartRef);
    
    if (cartDoc.exists()) {
      const cartData = cartDoc.data();
      const updatedItems = cartData.items.map(item => {
        if (item.id === itemId) {
          return { ...item, quantity: Math.max(1, quantity) };
        }
        return item;
      });
      
      await updateDoc(cartRef, {
        items: updatedItems
      });
    }
    
    // Return updated cart
    return getCart();
  } catch (error) {
    console.error("Error updating cart item quantity:", error);
    throw error;
  }
};

// Clear the cart
export const clearCart = async () => {
  try {
    const user = auth.currentUser;
    
    // For non-authenticated users, clear localStorage
    if (!user) {
      localStorage.removeItem('cart');
      return [];
    }
    
    // Clear cart in Firestore
    const cartRef = doc(db, "carts", user.uid);
    await updateDoc(cartRef, {
      items: []
    });
    
    return [];
  } catch (error) {
    console.error("Error clearing cart:", error);
    throw error;
  }
};

// Merge local cart with Firebase cart when user logs in
export const mergeCartOnLogin = async (userId) => {
  try {
    const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (localCart.length > 0) {
      const cartRef = doc(db, "carts", userId);
      const cartDoc = await getDoc(cartRef);
      
      if (cartDoc.exists()) {
        // Merge both carts avoiding duplicates
        const firestoreCart = cartDoc.data().items || [];
        const firestoreIds = firestoreCart.map(item => item.id);
        
        // Filter out items that already exist in Firebase cart
        const newItems = localCart.filter(item => !firestoreIds.includes(item.id));
        
        if (newItems.length > 0) {
          const updatedItems = [...firestoreCart, ...newItems];
          await updateDoc(cartRef, {
            items: updatedItems
          });
        }
      } else {
        // Create new cart with local items
        await setDoc(cartRef, {
          items: localCart
        });
      }
      
      // Clear local cart
      localStorage.removeItem('cart');
    }
    
    // Return the updated cart
    return getCart();
  } catch (error) {
    console.error("Error merging cart:", error);
    throw error;
  }
};