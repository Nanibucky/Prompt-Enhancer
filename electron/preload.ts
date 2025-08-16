// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// Create a shared API object with all methods
const sharedAPI = {
  // API Key and Settings methods (legacy methods for backward compatibility)
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (apiKey: string) => ipcRenderer.invoke('set-api-key', apiKey),
  removeApiKey: () => ipcRenderer.invoke('remove-api-key'),

  // Provider-specific API key methods
  getOpenAIApiKey: () => ipcRenderer.invoke('get-openai-api-key'),
  setOpenAIApiKey: (apiKey: string) => ipcRenderer.invoke('set-openai-api-key', apiKey),
  removeOpenAIApiKey: () => ipcRenderer.invoke('remove-openai-api-key'),
  getGeminiApiKey: () => ipcRenderer.invoke('get-gemini-api-key'),
  setGeminiApiKey: (apiKey: string) => ipcRenderer.invoke('set-gemini-api-key', apiKey),
  removeGeminiApiKey: () => ipcRenderer.invoke('remove-gemini-api-key'),

  // Settings methods
  getAutoPaste: () => ipcRenderer.invoke('get-auto-paste'),
  toggleAutoPaste: () => ipcRenderer.invoke('toggle-auto-paste'),

  // Provider selection methods
  getSelectedProvider: () => ipcRenderer.invoke('get-selected-provider'),
  setSelectedProvider: (provider: string) => ipcRenderer.invoke('set-selected-provider', provider),

  // Model selection methods
  getSelectedModel: () => ipcRenderer.invoke('get-selected-model'),
  setSelectedModel: (modelId: string) => ipcRenderer.invoke('set-selected-model', modelId),
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  getModelsForProvider: (provider: string) => ipcRenderer.invoke('get-models-for-provider', provider),

  // Keyboard shortcut methods
  getKeyboardShortcut: () => ipcRenderer.invoke('get-keyboard-shortcut'),
  setKeyboardShortcut: (shortcut: string) => ipcRenderer.invoke('set-keyboard-shortcut', shortcut),
  resetKeyboardShortcut: () => ipcRenderer.invoke('reset-keyboard-shortcut'),

  // Enhancement events
  onEnhancePrompt: (callback: () => void) => {
    ipcRenderer.on('enhance-prompt', callback);
    return () => ipcRenderer.removeAllListeners('enhance-prompt');
  },

  // Enhancement popup methods
  getOriginalText: () => ipcRenderer.invoke('get-original-text'),
  requestEnhancement: (promptType: string, modelId?: string, noCache: boolean = false, instructions: string | null = null) =>
    ipcRenderer.send('request-enhancement', promptType, modelId, noCache, instructions),
  confirmEnhancement: (text: string) => ipcRenderer.send('confirm-enhancement', text),
  onOriginalText: (callback: (text: string) => void) => {
    ipcRenderer.on('original-text', (_, text) => callback(text));
    return () => ipcRenderer.removeAllListeners('original-text');
  },
  onEnhancementResult: (callback: (text: string) => void) => {
    ipcRenderer.on('enhancement-result', (_, text) => callback(text));
    return () => ipcRenderer.removeAllListeners('enhancement-result');
  },
  onEnhancementError: (callback: (error: string) => void) => {
    ipcRenderer.on('enhancement-error', (_, error) => callback(error));
    return () => ipcRenderer.removeAllListeners('enhancement-error');
  },

  // Navigation events
  onNavigateToLogin: (callback: () => void) => {
    ipcRenderer.on('navigate-to-login', () => callback());
    return () => ipcRenderer.removeAllListeners('navigate-to-login');
  },
  onNavigateToSetup: (callback: () => void) => {
    ipcRenderer.on('navigate-to-setup', () => callback());
    return () => ipcRenderer.removeAllListeners('navigate-to-setup');
  },

  // Clipboard operations
  refreshClipboardText: () => ipcRenderer.send('refresh-clipboard-text'),
};

// Expose the API under both 'electron' and 'api' namespaces for backward compatibility
contextBridge.exposeInMainWorld('electron', sharedAPI);
contextBridge.exposeInMainWorld('api', sharedAPI);