/**
 * This file provides a bridge to handle Electron API access
 * It provides fallbacks when running in a browser environment
 */

import { registerWebShortcut, webClipboard } from './webFallback';

// Import the OpenAIModel type from the openai-service
import { OpenAIModel } from '../../electron/openai-service';

// Import the Prompt type from the PromptContext
import { Prompt } from '@/contexts/PromptContext';

// Define the type for our API
interface ElectronBridgeAPI {
  // API Key Management
  getApiKey: () => Promise<string>;
  setApiKey: (apiKey: string) => Promise<boolean>;
  removeApiKey: () => Promise<boolean>;

  // Settings
  getAutoPaste: () => Promise<boolean>;
  toggleAutoPaste: () => Promise<boolean>;
  getKeyboardShortcut: () => Promise<string>;
  setKeyboardShortcut: (shortcut: string) => Promise<boolean>;
  resetKeyboardShortcut: () => Promise<string>;

  // Model Management
  getSelectedModel: () => Promise<OpenAIModel>;
  setSelectedModel: (modelId: OpenAIModel) => Promise<boolean>;
  getAvailableModels: () => Promise<{id: OpenAIModel; name: string; description: string}[]>;

  // Clipboard Operations
  getOriginalText: () => Promise<string>;
  refreshClipboardText: () => void;

  // Instructions storage
  getLastInstructions: () => Promise<string>;
  setLastInstructions: (instructions: string) => Promise<boolean>;

  // Enhancement Operations
  requestEnhancement: (promptType: string, modelId?: string, noCache?: boolean, instructions?: string) => void;
  confirmEnhancement: (text: string) => void;

  // Event Listeners
  onOriginalText: (callback: (text: string) => void) => () => void;
  onEnhancementResult: (callback: (text: string) => void) => () => void;
  onEnhancementError: (callback: (error: string) => void) => () => void;

  // Prompt Management
  getPromptHistory: () => Promise<Prompt[]>;
  getFavoritePrompts: () => Promise<Prompt[]>;
  savePromptHistory: (prompts: Prompt[]) => Promise<boolean>;
  saveFavoritePrompts: (prompts: Prompt[]) => Promise<boolean>;
}

// Check if we're running in Electron
const isElectron = (): boolean => {
  // Check if window.api exists (which would be exposed by the Electron preload script)
  return window && 'api' in window;
};

// Create a mock API for browser environments
const createMockAPI = (): ElectronBridgeAPI => {
  // Use localStorage for persistence in browser environment
  let shortcutCleanupFn: (() => void) | null = null;

  return {
    getApiKey: async () => localStorage.getItem('openai-api-key') || '',
    setApiKey: async (apiKey: string) => {
      localStorage.setItem('openai-api-key', apiKey);
      return true;
    },
    removeApiKey: async () => {
      localStorage.removeItem('openai-api-key');
      return true;
    },
    getAutoPaste: async () => {
      return localStorage.getItem('auto-paste') !== 'false';
    },
    toggleAutoPaste: async () => {
      const current = localStorage.getItem('auto-paste') !== 'false';
      localStorage.setItem('auto-paste', (!current).toString());
      return !current;
    },
    getKeyboardShortcut: async () => {
      return localStorage.getItem('keyboard-shortcut') || 'CommandOrControl+Space+Space';
    },
    setKeyboardShortcut: async (shortcut: string) => {
      localStorage.setItem('keyboard-shortcut', shortcut);

      // Clean up previous shortcut if exists
      if (shortcutCleanupFn) {
        shortcutCleanupFn();
      }

      // Register the new shortcut
      shortcutCleanupFn = registerWebShortcut(shortcut, async () => {
        const text = await webClipboard.readText();
        if (text) {
          // In web mode, we'll just show an alert with the text that would be enhanced
          alert(`In Electron app, this text would be enhanced: ${text}`);
        }
      });

      return true;
    },
    resetKeyboardShortcut: async () => {
      const defaultShortcut = 'CommandOrControl+Space+Space';
      localStorage.setItem('keyboard-shortcut', defaultShortcut);

      // Clean up previous shortcut if exists
      if (shortcutCleanupFn) {
        shortcutCleanupFn();
      }

      // Register the default shortcut
      shortcutCleanupFn = registerWebShortcut(defaultShortcut, async () => {
        const text = await webClipboard.readText();
        if (text) {
          // In web mode, we'll just show an alert with the text that would be enhanced
          alert(`In Electron app, this text would be enhanced: ${text}`);
        }
      });

      return defaultShortcut;
    },
    getSelectedModel: async () => {
      return (localStorage.getItem('selected-model') || 'gpt-4o-mini') as OpenAIModel;
    },
    setSelectedModel: async (modelId: OpenAIModel) => {
      localStorage.setItem('selected-model', modelId);
      return true;
    },
    getAvailableModels: async () => {
      return [
        { id: 'gpt-3.5-turbo' as OpenAIModel, name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
        { id: 'gpt-4' as OpenAIModel, name: 'GPT-4', description: 'More powerful and accurate' },
        { id: 'gpt-4o' as OpenAIModel, name: 'GPT-4o', description: 'Latest model with enhanced capabilities' },
        { id: 'gpt-4o-mini' as OpenAIModel, name: 'GPT-4o Mini', description: 'Efficient version of GPT-4o with great performance' }
      ];
    },
    getOriginalText: async () => {
      return await webClipboard.readText();
    },
    refreshClipboardText: () => {
      // In web mode, we'll immediately read the clipboard and call the callback
      webClipboard.readText().then(text => {
        // Find any registered callbacks for onOriginalText and call them
        console.log('Refreshing clipboard text in web mode:', text);
      });
    },
    getLastInstructions: async () => {
      return localStorage.getItem('last-instructions') || '';
    },
    setLastInstructions: async (instructions: string) => {
      localStorage.setItem('last-instructions', instructions);
      return true;
    },
    requestEnhancement: () => {
      console.log('Enhancement requested, but not available in browser mode');
      alert('Enhancement feature is only available in the desktop app');
    },
    confirmEnhancement: (text) => {
      console.log('Enhancement confirmed, but not available in browser mode');
      webClipboard.writeText(text);
      alert('Text copied to clipboard (in desktop app, it would be auto-pasted)');
    },
    onOriginalText: (callback) => {
      // In web mode, we'll immediately call the callback with clipboard text
      webClipboard.readText().then(text => callback(text));
      return () => {};
    },
    onEnhancementResult: (callback) => {
      // This is a stub in web mode
      return () => {};
    },
    onEnhancementError: (callback) => {
      // This is a stub in web mode
      return () => {};
    },

    // Prompt Management
    getPromptHistory: async () => {
      const history = localStorage.getItem('prompt-history');
      return history ? JSON.parse(history) : [];
    },
    getFavoritePrompts: async () => {
      const favorites = localStorage.getItem('favorite-prompts');
      return favorites ? JSON.parse(favorites) : [];
    },
    savePromptHistory: async (prompts: Prompt[]) => {
      localStorage.setItem('prompt-history', JSON.stringify(prompts));
      return true;
    },
    saveFavoritePrompts: async (prompts: Prompt[]) => {
      localStorage.setItem('favorite-prompts', JSON.stringify(prompts));
      return true;
    }
  };
};

// Export the API - either the real Electron API or our mock
export const electronAPI: ElectronBridgeAPI = isElectron()
  ? (window as any).api
  : createMockAPI();

// Export a utility to check if we're in Electron
export { isElectron };