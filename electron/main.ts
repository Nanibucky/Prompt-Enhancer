
import { app, BrowserWindow, globalShortcut, ipcMain, Menu, Tray, clipboard, shell } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import { OpenAI } from 'openai';

// Import the model types and services
import { OpenAIModel } from './openai-service.js';
import { GeminiModel } from './gemini-service.js';
import { ModelProvider, SupportedModel, modelService } from './model-service.js';

// Define the store schema
interface StoreSchema {
  'openai-api-key': string;
  'gemini-api-key': string;
  'selected-provider': ModelProvider;
  'auto-paste': boolean;
  'selected-model': SupportedModel;
  'dev-server-url': string;
}

// Initialize the store
const store: any = new Store({
  schema: {
    'openai-api-key': {
      type: 'string',
      default: ''
    },
    'gemini-api-key': {
      type: 'string',
      default: ''
    },
    'selected-provider': {
      type: 'string',
      default: 'openai'
    },
    'auto-paste': {
      type: 'boolean',
      default: true
    },
    'selected-model': {
      type: 'string',
      default: 'gpt-4o-mini'
    },
    'dev-server-url': {
      type: 'string',
      default: 'http://localhost:5173'
    }
  },
  encryptionKey: process.env.ENCRYPTION_KEY || 'prompt-enhancer-secure-key',
  clearInvalidConfig: true
});

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: true,
    resizable: true,
    fullscreenable: true,
    title: 'AI Prompt Enhancer',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 20, y: 20 } : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the index.html of the app
  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  } else {
    // In development, load from the dev server
    const devServerUrl = store.get('dev-server-url') as string || 'http://localhost:5173';
    mainWindow.loadURL(devServerUrl);
  }

  // Hide window instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      return false;
    }
    return true;
  });

  return mainWindow;
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Set API Key',
      click: () => {
        mainWindow?.show();
      }
    },
    {
      label: 'Toggle Auto-Paste',
      type: 'checkbox',
      checked: store.get('auto-paste'),
      click: () => {
        const current = store.get('auto-paste');
        store.set('auto-paste', !current);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setToolTip('AI Prompt Enhancer');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
}

// Register the global shortcut
function registerShortcut() {
  // For macOS: Cmd + Space + Space
  // For Windows/Linux: Ctrl + Space + Space
  const shortcutKey = process.platform === 'darwin' ? 'CommandOrControl+Space+Space' : 'CommandOrControl+Space+Space';

  globalShortcut.register(shortcutKey, () => {
    enhancePrompt();
  });
}

// Function to enhance prompt using the selected provider (OpenAI or Gemini)
async function enhancePrompt() {
  const provider = store.get('selected-provider') as ModelProvider || 'openai';
  const apiKey = provider === 'openai'
    ? store.get('openai-api-key')
    : store.get('gemini-api-key');

  if (!apiKey) {
    mainWindow?.show();
    return;
  }

  const textToEnhance = clipboard.readText();

  if (!textToEnhance) {
    // No text in clipboard
    return;
  }

  try {
    const selectedModel = store.get('selected-model') as SupportedModel ||
      (provider === 'openai' ? 'gpt-4o-mini' : 'gemini-pro');

    // If the selected model doesn't match the provider, use the default model for that provider
    if (!modelService.isModelFromProvider(selectedModel, provider)) {
      const defaultModel = modelService.getDefaultModelForProvider(provider);
      store.set('selected-model', defaultModel);
    }

    const systemPrompt = `You are an expert prompt engineer that specializes in rewriting user prompts to be more effective with large language models (LLMs). Your ONLY job is to enhance prompts, not to provide answers.

RULES:
1. NEVER answer the user's question - ONLY rewrite their prompt
2. Preserve the original intent and meaning of the prompt
3. Add necessary context and details that were implied but not stated
4. Make the prompt more specific, clear, and actionable
5. Format the prompt professionally with proper structure
6. Remove ambiguities and vague language
7. For creative requests, enhance descriptive elements
8. For technical questions, introduce relevant technical terminology
9. For complex tasks, break down into clearer steps or components
10. Keep the enhanced prompt concise but comprehensive

DIFFERENT PROMPT TYPES:
- QUESTION-ANSWERING: Add specific parameters about desired detail level, format, and perspective
- CREATIVE WRITING: Enhance with specific tone, style, length, and character details
- CODE/TECHNICAL: Specify language, platform, constraints, and expected behavior
- ANALYSIS: Define what aspects to analyze and what kind of insights are sought
- INSTRUCTIONS/HOW-TO: Clarify exact steps needed and desired outcome

FORMAT YOUR RESPONSE AS:
[Enhanced Prompt]

DO NOT include explanations about your changes, commentary, or anything else outside the enhanced prompt itself.`;

    const enhancedText = await modelService.enhancePrompt(
      textToEnhance,
      systemPrompt,
      apiKey as string,
      selectedModel,
      provider
    );

    clipboard.writeText(enhancedText);

    // Auto-paste if enabled
    if (store.get('auto-paste')) {
      // Simulate Ctrl+V or Cmd+V using robotjs if available
      try {
        // Try to require robotjs - this will throw an error if not installed
        const robotjs = require('robotjs');

        // Use Command+V on macOS and Control+V on other platforms
        if (process.platform === 'darwin') {
          robotjs.keyTap('v', 'command');
        } else {
          robotjs.keyTap('v', 'control');
        }
      } catch (error) {
        console.error('Auto-paste error:', error);
        // Fallback message if robotjs is not installed
        console.log('Auto-paste is enabled but robotjs is not installed. Text is copied to clipboard.');
      }
    }
  } catch (error) {
    console.error('Error enhancing prompt:', error);
  }
}

// IPC handlers for API keys
ipcMain.handle('get-openai-api-key', () => {
  return store.get('openai-api-key');
});

ipcMain.handle('set-openai-api-key', (_, apiKey: string) => {
  store.set('openai-api-key', apiKey);
  return true;
});

ipcMain.handle('remove-openai-api-key', () => {
  store.delete('openai-api-key');
  return true;
});

ipcMain.handle('get-gemini-api-key', () => {
  return store.get('gemini-api-key');
});

ipcMain.handle('set-gemini-api-key', (_, apiKey: string) => {
  store.set('gemini-api-key', apiKey);
  return true;
});

ipcMain.handle('remove-gemini-api-key', () => {
  store.delete('gemini-api-key');
  return true;
});

// For backward compatibility
ipcMain.handle('get-api-key', () => {
  const provider = store.get('selected-provider') as ModelProvider || 'openai';
  return provider === 'openai' ? store.get('openai-api-key') : store.get('gemini-api-key');
});

ipcMain.handle('set-api-key', (_, apiKey: string) => {
  const provider = store.get('selected-provider') as ModelProvider || 'openai';
  if (provider === 'openai') {
    store.set('openai-api-key', apiKey);
  } else {
    store.set('gemini-api-key', apiKey);
  }
  return true;
});

ipcMain.handle('remove-api-key', () => {
  const provider = store.get('selected-provider') as ModelProvider || 'openai';
  if (provider === 'openai') {
    store.delete('openai-api-key');
  } else {
    store.delete('gemini-api-key');
  }
  return true;
});

// Settings handlers
ipcMain.handle('get-auto-paste', () => {
  return store.get('auto-paste');
});

ipcMain.handle('toggle-auto-paste', () => {
  const current = store.get('auto-paste');
  store.set('auto-paste', !current);
  return !current;
});

// Provider selection handlers
ipcMain.handle('get-selected-provider', () => {
  return store.get('selected-provider') || 'openai';
});

ipcMain.handle('set-selected-provider', (_, provider: ModelProvider) => {
  store.set('selected-provider', provider);

  // When changing provider, ensure the selected model is compatible
  const currentModel = store.get('selected-model') as SupportedModel;
  if (!modelService.isModelFromProvider(currentModel, provider)) {
    const defaultModel = modelService.getDefaultModelForProvider(provider);
    store.set('selected-model', defaultModel);
  }

  return true;
});

// Model selection handlers
ipcMain.handle('get-selected-model', () => {
  return store.get('selected-model') || 'gpt-4o-mini';
});

ipcMain.handle('set-selected-model', (_, modelId: SupportedModel) => {
  store.set('selected-model', modelId);
  return true;
});

ipcMain.handle('get-available-models', async () => {
  return modelService.getAllAvailableModels();
});

ipcMain.handle('get-models-for-provider', async (_, provider: ModelProvider) => {
  return modelService.getModelsForProvider(provider);
});

// Keyboard shortcut handlers (placeholders for now)
ipcMain.handle('get-keyboard-shortcut', () => {
  return 'CommandOrControl+Space+Space';
});

ipcMain.handle('set-keyboard-shortcut', (_, shortcut: string) => {
  // TODO: Implement dynamic shortcut registration
  return true;
});

ipcMain.handle('reset-keyboard-shortcut', () => {
  // TODO: Reset to default shortcut
  return true;
});

// Enhancement popup handlers (placeholders for now)
ipcMain.handle('get-original-text', () => {
  return '';
});

ipcMain.on('request-enhancement', (_, promptType: string, modelId?: string, noCache: boolean = false, instructions: string | null = null) => {
  // TODO: Implement enhancement popup functionality
});

ipcMain.on('confirm-enhancement', (_, text: string) => {
  // TODO: Handle enhancement confirmation
});

ipcMain.on('refresh-clipboard-text', () => {
  // TODO: Refresh clipboard text
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerShortcut();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// Unregister shortcuts when app is about to quit
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
