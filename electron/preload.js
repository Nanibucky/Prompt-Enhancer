// Preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    getApiKey: () => ipcRenderer.invoke('get-api-key'),
    setApiKey: (apiKey) => ipcRenderer.invoke('set-api-key', apiKey),
    removeApiKey: () => ipcRenderer.invoke('remove-api-key'),
    getAutoPaste: () => ipcRenderer.invoke('get-auto-paste'),
    toggleAutoPaste: () => ipcRenderer.invoke('toggle-auto-paste'),
    getSelectedModel: () => ipcRenderer.invoke('get-selected-model'),
    setSelectedModel: (modelId) => ipcRenderer.invoke('set-selected-model', modelId),
    getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
    getKeyboardShortcut: () => ipcRenderer.invoke('get-keyboard-shortcut'),
    setKeyboardShortcut: (shortcut) => ipcRenderer.invoke('set-keyboard-shortcut', shortcut),
    resetKeyboardShortcut: () => ipcRenderer.invoke('reset-keyboard-shortcut'),
    onEnhancePrompt: (callback) => {
      ipcRenderer.on('enhance-prompt', callback);
    }
  }
);

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
