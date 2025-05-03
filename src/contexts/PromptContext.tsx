import React, { createContext, useContext, useState, useEffect } from 'react';
import { electronAPI } from '@/utils/electronBridge';

export interface Prompt {
  id: string;
  text: string;
  type: 'agent' | 'general' | 'answer';
  title: string;
  createdAt: string;
  isFavorite: boolean;
}

interface PromptContextType {
  history: Prompt[];
  favorites: Prompt[];
  addToHistory: (prompt: Omit<Prompt, 'id' | 'createdAt'>) => Promise<void>;
  addToFavorites: (promptId: string) => Promise<void>;
  removeFromFavorites: (promptId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  getPromptById: (id: string) => Prompt | undefined;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export function PromptProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<Prompt[]>([]);
  const [favorites, setFavorites] = useState<Prompt[]>([]);

  // Load history and favorites on mount
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const savedHistory = await electronAPI.getPromptHistory();
        const savedFavorites = await electronAPI.getFavoritePrompts();
        
        if (savedHistory) setHistory(savedHistory);
        if (savedFavorites) setFavorites(savedFavorites);
      } catch (error) {
        console.error('Failed to load prompts:', error);
      }
    };

    loadPrompts();
  }, []);

  const addToHistory = async (prompt: Omit<Prompt, 'id' | 'createdAt'>) => {
    try {
      const newPrompt: Prompt = {
        ...prompt,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        isFavorite: false
      };

      const updatedHistory = [newPrompt, ...history].slice(0, 50); // Keep only the last 50 prompts
      setHistory(updatedHistory);
      await electronAPI.savePromptHistory(updatedHistory);
    } catch (error) {
      console.error('Failed to add prompt to history:', error);
    }
  };

  const addToFavorites = async (promptId: string) => {
    try {
      const prompt = history.find(p => p.id === promptId);
      if (!prompt) return;

      // Update the prompt in history
      const updatedHistory = history.map(p => 
        p.id === promptId ? { ...p, isFavorite: true } : p
      );
      setHistory(updatedHistory);
      await electronAPI.savePromptHistory(updatedHistory);

      // Add to favorites
      const updatedFavorites = [...favorites, { ...prompt, isFavorite: true }];
      setFavorites(updatedFavorites);
      await electronAPI.saveFavoritePrompts(updatedFavorites);
    } catch (error) {
      console.error('Failed to add prompt to favorites:', error);
    }
  };

  const removeFromFavorites = async (promptId: string) => {
    try {
      // Update the prompt in history
      const updatedHistory = history.map(p => 
        p.id === promptId ? { ...p, isFavorite: false } : p
      );
      setHistory(updatedHistory);
      await electronAPI.savePromptHistory(updatedHistory);

      // Remove from favorites
      const updatedFavorites = favorites.filter(p => p.id !== promptId);
      setFavorites(updatedFavorites);
      await electronAPI.saveFavoritePrompts(updatedFavorites);
    } catch (error) {
      console.error('Failed to remove prompt from favorites:', error);
    }
  };

  const clearHistory = async () => {
    try {
      // Keep favorites in history
      const favoritesInHistory = history.filter(p => p.isFavorite);
      setHistory(favoritesInHistory);
      await electronAPI.savePromptHistory(favoritesInHistory);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const getPromptById = (id: string) => {
    return history.find(p => p.id === id) || favorites.find(p => p.id === id);
  };

  return (
    <PromptContext.Provider value={{
      history,
      favorites,
      addToHistory,
      addToFavorites,
      removeFromFavorites,
      clearHistory,
      getPromptById
    }}>
      {children}
    </PromptContext.Provider>
  );
}

export function usePrompts() {
  const context = useContext(PromptContext);
  if (context === undefined) {
    throw new Error('usePrompts must be used within a PromptProvider');
  }
  return context;
}
