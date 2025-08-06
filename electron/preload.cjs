// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script executing...');

// Add a global error handler to catch any uncaught errors
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
});

// Add a global promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Log when the DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  console.log('Root element:', document.getElementById('root'));

  // Add a keyboard event listener for Alt+Space
  window.addEventListener('keydown', (event) => {
    // Check if Alt+Space was pressed
    if (event.altKey && event.code === 'Space') {
      console.log('Alt+Space detected in preload script');
      // Send the enhance-prompt event to the main process
      ipcRenderer.send('enhance-prompt');
    }
  });

  // Fix for file:// protocol in Electron
  if (window.location.protocol === 'file:') {
    console.log('Running in Electron with file:// protocol, applying fixes...');

    // Override the base URL for assets
    const baseElement = document.createElement('base');
    baseElement.href = './';
    document.head.appendChild(baseElement);

    // Fix asset paths
    document.querySelectorAll('script[src^="/"], link[href^="/"]').forEach(el => {
      if (el.src) {
        el.src = el.src.replace(/^\//, './');
      } else if (el.href) {
        el.href = el.href.replace(/^\//, './');
      }
    });

    // Log that we've applied the fix
    console.log('Asset path fixes applied for Electron');
  }
});

// Expose a function to trigger the enhancement directly
contextBridge.exposeInMainWorld('enhancer', {
  triggerEnhancement: () => {
    console.log('triggerEnhancement called from renderer');
    ipcRenderer.send('enhance-prompt');
  }
});

contextBridge.exposeInMainWorld('api', {
  // API Key and Settings methods
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (apiKey) => ipcRenderer.invoke('set-api-key', apiKey),
  removeApiKey: () => ipcRenderer.invoke('remove-api-key'),
  getAutoPaste: () => ipcRenderer.invoke('get-auto-paste'),
  toggleAutoPaste: () => ipcRenderer.invoke('toggle-auto-paste'),

  // Model selection methods
  getSelectedModel: () => ipcRenderer.invoke('get-selected-model'),
  setSelectedModel: (modelId) => ipcRenderer.invoke('set-selected-model', modelId),
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),

  // Keyboard shortcut methods
  getKeyboardShortcut: () => ipcRenderer.invoke('get-keyboard-shortcut'),
  setKeyboardShortcut: (shortcut) => ipcRenderer.invoke('set-keyboard-shortcut', shortcut),
  resetKeyboardShortcut: () => ipcRenderer.invoke('reset-keyboard-shortcut'),

  // Enhancement popup methods
  getOriginalText: () => ipcRenderer.invoke('get-original-text'),
  refreshClipboardText: () => ipcRenderer.send('refresh-clipboard-text'),
  requestEnhancement: (promptType, modelId) => ipcRenderer.send('request-enhancement', promptType, modelId),
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
  },

  // Navigation events
  onNavigateToLogin: (callback) => {
    ipcRenderer.on('navigate-to-login', () => callback());
    return () => ipcRenderer.removeAllListeners('navigate-to-login');
  },

  // Prompt Management
  getPromptHistory: () => ipcRenderer.invoke('get-prompt-history'),
  getFavoritePrompts: () => ipcRenderer.invoke('get-favorite-prompts'),
  savePromptHistory: (prompts) => ipcRenderer.invoke('save-prompt-history', prompts),
  saveFavoritePrompts: (prompts) => ipcRenderer.invoke('save-favorite-prompts', prompts),
});
