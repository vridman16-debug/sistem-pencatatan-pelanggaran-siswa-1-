import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { User, AuthContextType, Role } from '../types.ts';
import { authService } from '../services/authService.ts';
import { auth } from '../firebaseConfig.ts'; // Import Firebase auth instance
// FIX: Use * as import for Firebase Auth functions and types to resolve "Module has no exported member" errors.
import * as FirebaseAuth from 'firebase/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Use Firebase's onAuthStateChanged to manage user session
  useEffect(() => {
    // FIX: Call onAuthStateChanged from FirebaseAuth namespace, and use FirebaseAuth.User for type.
    const unsubscribe = FirebaseAuth.onAuthStateChanged(auth, async (firebaseUser: FirebaseAuth.User | null) => {
      if (firebaseUser) {
        // If Firebase Auth user exists, fetch their full profile from Firestore
        try {
          const currentUser = await authService.getCurrentUser(); // This now fetches from Firestore
          setUser(currentUser);
        } catch (error) {
          console.error("Failed to load user profile from Firestore:", error);
          setUser(null);
          await authService.logout(); // Force logout if profile can't be loaded
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Clean up subscription on unmount
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs only once on mount

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const loggedInUser = await authService.login(username, password);
      if (loggedInUser) {
        setUser(loggedInUser);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login attempt failed:", error);
      throw error; // Re-throw for LoginForm to handle
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null); // Clear user state immediately
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }, []);

  const value = {
    user,
    login,
    logout,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-lg text-gray-700">Loading user session...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Custom hook to check user role
export const useHasRole = (requiredRoles: Role[]): boolean => {
  const { user } = useAuth();
  if (!user) {
    return false;
  }
  return requiredRoles.includes(user.role);
};