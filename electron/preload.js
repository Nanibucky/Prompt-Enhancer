// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Create a shared API object with all methods
const sharedAPI = {
  // API Key and Settings methods (legacy methods for backward compatibility)
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (apiKey) => ipcRenderer.invoke('set-api-key', apiKey),
  removeApiKey: () => ipcRenderer.invoke('remove-api-key'),

  // Provider-specific API key methods
  getOpenAIApiKey: () => ipcRenderer.invoke('get-openai-api-key'),
  setOpenAIApiKey: (apiKey) => ipcRenderer.invoke('set-openai-api-key', apiKey),
  removeOpenAIApiKey: () => ipcRenderer.invoke('remove-openai-api-key'),
  getGeminiApiKey: () => ipcRenderer.invoke('get-gemini-api-key'),
  setGeminiApiKey: (apiKey) => ipcRenderer.invoke('set-gemini-api-key', apiKey),
  removeGeminiApiKey: () => ipcRenderer.invoke('remove-gemini-api-key'),

  // Settings methods
  getAutoPaste: () => ipcRenderer.invoke('get-auto-paste'),
  toggleAutoPaste: () => ipcRenderer.invoke('toggle-auto-paste'),

  // Provider selection methods
  getSelectedProvider: () => ipcRenderer.invoke('get-selected-provider'),
  setSelectedProvider: (provider) => ipcRenderer.invoke('set-selected-provider', provider),

  // Model selection methods
  getSelectedModel: () => ipcRenderer.invoke('get-selected-model'),
  setSelectedModel: (modelId) => ipcRenderer.invoke('set-selected-model', modelId),
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  getModelsForProvider: (provider) => ipcRenderer.invoke('get-models-for-provider', provider),

  // Keyboard shortcut methods
  getKeyboardShortcut: () => ipcRenderer.invoke('get-keyboard-shortcut'),
  setKeyboardShortcut: (shortcut) => ipcRenderer.invoke('set-keyboard-shortcut', shortcut),
  resetKeyboardShortcut: () => ipcRenderer.invoke('reset-keyboard-shortcut'),

  // Navigation events
  onNavigateToLogin: (callback) => {
    ipcRenderer.on('navigate-to-login', callback);
    return () => ipcRenderer.removeAllListeners('navigate-to-login');
  },
  onNavigateToSetup: (callback) => {
    ipcRenderer.on('navigate-to-setup', callback);
    return () => ipcRenderer.removeAllListeners('navigate-to-setup');
  },

  // Enhancement events
  onEnhancePrompt: (callback) => {
    ipcRenderer.on('enhance-prompt', callback);
    return () => ipcRenderer.removeAllListeners('enhance-prompt');
  },

  // Enhancement popup methods
  getOriginalText: () => ipcRenderer.invoke('get-original-text'),
  refreshClipboardText: () => ipcRenderer.send('refresh-clipboard-text'),
  requestEnhancement: (promptType, modelId, noCache = false, instructions = null) =>
    ipcRenderer.send('request-enhancement', promptType, modelId, noCache, instructions),
  confirmEnhancement: (text) => ipcRenderer.send('confirm-enhancement', text),
  onOriginalText: (callback) => {
    ipcRenderer.on('original-text', (_, text) => callback(text));
    return () => ipcRenderer.removeAllListeners('original-text');
  },
  onEnhancementResult: (callback) => {
    ipcRenderer.on('enhancement-result', (_, text) => callback(text));
    return () => ipcRenderer.removeAllListeners('enhancement-result');
  },
  onEnhancementError: (callback) => {
    ipcRenderer.on('enhancement-error', (_, error) => callback(error));
    return () => ipcRenderer.removeAllListeners('enhancement-error');
  }
};

// Expose the API under both 'electron' and 'api' namespaces for backward compatibility
contextBridge.exposeInMainWorld('electron', sharedAPI);
contextBridge.exposeInMainWorld('api', sharedAPI);

// Log when preload script has loaded
console.log('Preload script loaded successfully');

// Fix for file:// protocol in Electron
if (window.location.protocol === 'file:') {
  console.log('Running in Electron with file:// protocol, applying fixes...');

  // Override the base URL for assets
  const baseElement = document.createElement('base');
  baseElement.href = './';
  document.head.appendChild(baseElement);

  // Log that we've applied the fix
  console.log('Base URL fix applied for Electron');
}
