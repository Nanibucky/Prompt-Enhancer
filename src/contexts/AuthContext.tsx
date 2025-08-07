
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthState, User } from '@/types/auth';
import { electronAPI } from '@/utils/electronBridge';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateApiKey: (apiKey: string) => Promise<boolean>;
  removeApiKey: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  });

  useEffect(() => {
    // Load auth state from localStorage on mount
    try {
      // Check if localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        console.warn('localStorage not available');
        return;
      }

      const savedUser = localStorage.getItem('user');
      if (savedUser && savedUser.trim().length > 0) {
        const parsedUser = JSON.parse(savedUser);
        
        // Validate user object structure
        if (parsedUser && typeof parsedUser === 'object' && 
            typeof parsedUser.email === 'string' && 
            typeof parsedUser.password === 'string') {
          setAuthState({
            user: parsedUser,
            isAuthenticated: true,
          });
        } else {
          console.warn('Invalid user data structure:', parsedUser);
          localStorage.removeItem('user');
        }
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
      // If there's an error parsing the saved user, clear it
      try {
        localStorage.removeItem('user');
      } catch (removeError) {
        console.error('Error removing invalid user data:', removeError);
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Validate input parameters
      if (!email || typeof email !== 'string' || email.trim().length === 0) {
        console.error('Invalid email provided');
        return false;
      }
      
      if (!password || typeof password !== 'string' || password.trim().length === 0) {
        console.error('Invalid password provided');
        return false;
      }

      // Check if localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        console.error('localStorage not available');
        return false;
      }

      // In a real app, you'd hash the password before storing/comparing
      const usersJson = localStorage.getItem('users') || '[]';
      let users;
      
      try {
        users = JSON.parse(usersJson);
      } catch (parseError) {
        console.error('Error parsing users data:', parseError);
        // Reset users data if it's corrupted
        localStorage.setItem('users', '[]');
        return false;
      }

      if (!Array.isArray(users)) {
        console.error('Users data is not an array:', users);
        // Reset users data if it's corrupted
        localStorage.setItem('users', '[]');
        return false;
      }

      // Find user with proper validation
      const user = users.find((u: any) => {
        return u && typeof u === 'object' && 
               typeof u.email === 'string' && 
               typeof u.password === 'string' &&
               u.email.trim().toLowerCase() === email.trim().toLowerCase() && 
               u.password === password;
      });

      if (user) {
        // Sync API key between user account and electron store
        try {
          const storeApiKey = await electronAPI.getApiKey();

          if (user.apiKey && typeof user.apiKey === 'string') {
            // If user has an API key in their account, use it
            await electronAPI.setApiKey(user.apiKey);
            console.log('API key loaded from user account');
          } else if (storeApiKey && typeof storeApiKey === 'string' && storeApiKey.trim().length > 0) {
            // If API key exists in electron store but not in user account, save it to user account
            user.apiKey = storeApiKey;
            // Update the user in the users array
            const updatedUsers = users.map((u: any) =>
              u && u.email === user.email ? { ...u, apiKey: storeApiKey } : u
            );
            localStorage.setItem('users', JSON.stringify(updatedUsers));
            console.log('API key saved to user account');
          }
        } catch (apiError) {
          console.error('Error syncing API key:', apiError);
          // Continue with login even if API key sync fails
        }

        // Validate user object before setting state
        const validatedUser = {
          email: user.email,
          password: user.password,
          ...(user.apiKey && { apiKey: user.apiKey })
        };

        setAuthState({ user: validatedUser, isAuthenticated: true });
        localStorage.setItem('user', JSON.stringify(validatedUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      // Reset users data if it's corrupted
      try {
        localStorage.setItem('users', '[]');
      } catch (resetError) {
        console.error('Error resetting users data:', resetError);
      }
      return false;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      // Validate input parameters
      if (!email || typeof email !== 'string' || email.trim().length === 0) {
        console.error('Invalid email for registration');
        return false;
      }
      
      if (!password || typeof password !== 'string' || password.trim().length === 0) {
        console.error('Invalid password for registration');
        return false;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        console.error('Invalid email format');
        return false;
      }

      // Check if localStorage is available
      if (typeof window === 'undefined' || !window.localStorage) {
        console.error('localStorage not available for registration');
        return false;
      }

      let users;
      try {
        users = JSON.parse(localStorage.getItem('users') || '[]');
      } catch (parseError) {
        console.error('Error parsing existing users:', parseError);
        users = [];
      }

      if (!Array.isArray(users)) {
        console.warn('Users data is not an array, resetting');
        users = [];
      }

      // Check if user already exists
      const existingUser = users.find((u: any) => 
        u && typeof u === 'object' && 
        typeof u.email === 'string' && 
        u.email.trim().toLowerCase() === email.trim().toLowerCase()
      );

      if (existingUser) {
        console.log('User already exists');
        return false;
      }

      const newUser = { 
        email: email.trim().toLowerCase(), 
        password: password // In production, this should be hashed
      };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));

      // Don't automatically log in after registration
      // Let the user explicitly log in with their credentials
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const updateApiKey = async (apiKey: string) => {
    try {
      // Validate input
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        console.error('Invalid API key provided');
        return false;
      }

      if (!authState.isAuthenticated || !authState.user) {
        console.error('Cannot update API key: User not authenticated');
        return false;
      }

      // Save API key to electron store
      await electronAPI.setApiKey(apiKey.trim());

      // Update user in state
      const updatedUser = { ...authState.user, apiKey: apiKey.trim() };
      setAuthState({ ...authState, user: updatedUser });

      // Update user in localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Update user in users array
      try {
        const usersJson = localStorage.getItem('users') || '[]';
        const users = JSON.parse(usersJson);
        if (Array.isArray(users)) {
          const updatedUsers = users.map((u: any) =>
            u && u.email === updatedUser.email ? { ...u, apiKey: apiKey.trim() } : u
          );
          localStorage.setItem('users', JSON.stringify(updatedUsers));
        }
      } catch (usersError) {
        console.error('Error updating users array:', usersError);
        // Continue even if users array update fails
      }

      return true;
    } catch (error) {
      console.error('Error updating API key:', error);
      return false;
    }
  };

  const removeApiKey = async () => {
    try {
      if (!authState.isAuthenticated || !authState.user) {
        console.error('Cannot remove API key: User not authenticated');
        return false;
      }

      // Remove API key from electron store
      await electronAPI.removeApiKey();

      // Update user in state
      const updatedUser = { ...authState.user };
      delete updatedUser.apiKey;
      setAuthState({ ...authState, user: updatedUser });

      // Update user in localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Update user in users array
      try {
        const usersJson = localStorage.getItem('users') || '[]';
        const users = JSON.parse(usersJson);
        if (Array.isArray(users)) {
          const updatedUsers = users.map((u: any) => {
            if (u && u.email === updatedUser.email) {
              const newUser = { ...u };
              delete newUser.apiKey;
              return newUser;
            }
            return u;
          });
          localStorage.setItem('users', JSON.stringify(updatedUsers));
        }
      } catch (usersError) {
        console.error('Error updating users array:', usersError);
        // Continue even if users array update fails
      }

      return true;
    } catch (error) {
      console.error('Error removing API key:', error);
      return false;
    }
  };

  const logout = () => {
    // We don't remove the API key on logout to ensure it persists between sessions
    // This is intentional to improve user experience
    setAuthState({ user: null, isAuthenticated: false });
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, register, logout, updateApiKey, removeApiKey }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
