
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
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        // Validate that the parsed user has the expected structure
        if (parsedUser && typeof parsedUser === 'object' && 
            typeof parsedUser.email === 'string' && 
            typeof parsedUser.password === 'string') {
          setAuthState({
            user: parsedUser,
            isAuthenticated: true,
          });
        } else {
          console.warn('Invalid user data structure in localStorage, clearing it');
          localStorage.removeItem('user');
        }
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
      // If there's an error parsing the saved user, clear it
      localStorage.removeItem('user');
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // In a real app, you'd hash the password before storing/comparing
      const usersJson = localStorage.getItem('users') || '[]';
      const users = JSON.parse(usersJson);

      if (!Array.isArray(users)) {
        console.error('Users data is not an array:', users);
        // Reset users data if it's corrupted
        localStorage.setItem('users', '[]');
        return false;
      }

      const user = users.find((u: User) => u.email === email && u.password === password);

      if (user) {
        // Sync API key between user account and electron store
        try {
          const storeApiKey = await electronAPI.getApiKey();

          if (user.apiKey) {
            // If user has an API key in their account, use it
            await electronAPI.setApiKey(user.apiKey);
            console.log('API key loaded from user account');
          } else if (storeApiKey) {
            // If API key exists in electron store but not in user account, save it to user account
            user.apiKey = storeApiKey;
            // Update the user in the users array
            const updatedUsers = users.map((u: User) =>
              u.email === user.email ? { ...u, apiKey: storeApiKey } : u
            );
            localStorage.setItem('users', JSON.stringify(updatedUsers));
            console.log('API key saved to user account');
          }
        } catch (error) {
          console.error('Error syncing API key:', error);
        }

        setAuthState({ user, isAuthenticated: true });
        localStorage.setItem('user', JSON.stringify(user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      // Reset users data if it's corrupted
      localStorage.setItem('users', '[]');
      return false;
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');

      if (users.some((u: User) => u.email === email)) {
        return false;
      }

      const newUser = { email, password };
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
      if (!authState.isAuthenticated || !authState.user) {
        console.error('Cannot update API key: User not authenticated');
        return false;
      }

      // Save API key to electron store
      await electronAPI.setApiKey(apiKey);

      // Update user in state
      const updatedUser = { ...authState.user, apiKey };
      setAuthState({ ...authState, user: updatedUser });

      // Update user in localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));

      // Update user in users array
      const usersJson = localStorage.getItem('users') || '[]';
      const users = JSON.parse(usersJson);
      if (Array.isArray(users)) {
        const updatedUsers = users.map((u: User) =>
          u.email === updatedUser.email ? { ...u, apiKey } : u
        );
        localStorage.setItem('users', JSON.stringify(updatedUsers));
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
      const usersJson = localStorage.getItem('users') || '[]';
      const users = JSON.parse(usersJson);
      if (Array.isArray(users)) {
        const updatedUsers = users.map((u: User) => {
          if (u.email === updatedUser.email) {
            const newUser = { ...u };
            delete newUser.apiKey;
            return newUser;
          }
          return u;
        });
        localStorage.setItem('users', JSON.stringify(updatedUsers));
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
