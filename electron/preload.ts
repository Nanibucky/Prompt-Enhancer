// electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // API Key and Settings methods
  getApiKey: () => ipcRenderer.invoke('get-api-key'),
  setApiKey: (apiKey: string) => ipcRenderer.invoke('set-api-key', apiKey),
  removeApiKey: () => ipcRenderer.invoke('remove-api-key'),
  getAutoPaste: () => ipcRenderer.invoke('get-auto-paste'),
  toggleAutoPaste: () => ipcRenderer.invoke('toggle-auto-paste'),

  // Model selection methods
  getSelectedModel: () => ipcRenderer.invoke('get-selected-model'),
  setSelectedModel: (modelId: string) => ipcRenderer.invoke('set-selected-model', modelId),
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),

  // Enhancement popup methods
  getOriginalText: () => ipcRenderer.invoke('get-original-text'),
  requestEnhancement: (promptType: string, modelId?: string) => ipcRenderer.send('request-enhancement', promptType, modelId),
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

  // Clipboard operations
  refreshClipboardText: () => ipcRenderer.send('refresh-clipboard-text'),
});