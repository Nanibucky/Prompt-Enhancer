// electron/prompt-enhancer.ts
import { clipboard, BrowserWindow, ipcMain, app } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { openai, OpenAIModel } from './openai-service.js';
import Store from 'electron-store';
import * as fs from 'fs';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const store = new Store();

// Track the enhancement window to prevent multiple instances
let enhancementWindow: BrowserWindow | null = null;

const createEnhancementWindow = (parentWindow: BrowserWindow) => {
  // Get the position of the parent window
  const parentBounds = parentWindow.getBounds();

  // Calculate the position for the enhancement window to be centered relative to the parent
  const width = 550;
  const height = 500;
  const x = Math.round(parentBounds.x + (parentBounds.width - width) / 2);
  const y = Math.round(parentBounds.y + (parentBounds.height - height) / 2);

  const enhancementWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    show: false,
    parent: null, // No parent to make it standalone
    modal: false,
    frame: true,
    resizable: true,
    alwaysOnTop: true, // Keep it on top
    webPreferences: {
      nodeIntegration: false, // Set to false for security
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Use the correct path to enhancement.html based on whether the app is packaged
  if (app.isPackaged) {
    enhancementWindow.loadFile(path.join(__dirname, '../enhancement.html'));
  } else {
    // Try to load from port 8081 first (as Vite might use this if 8080 is occupied)
    enhancementWindow.loadURL('http://localhost:8081/enhancement.html')
      .catch(() => {
        // Fallback to port 8080 if 8081 fails
        enhancementWindow.loadURL('http://localhost:8080/enhancement.html')
          .catch(err => console.error('Failed to load enhancement window:', err));
      });
  }

  // Only open DevTools in development mode
  if (!app.isPackaged) {
    enhancementWindow.webContents.openDevTools();
  }

  enhancementWindow.once('ready-to-show', () => {
    // Show the window and bring it to the front
    enhancementWindow.show();
    enhancementWindow.focus();

    // Force the window to be on top
    enhancementWindow.setAlwaysOnTop(true, 'screen-saver');

    // Ensure it's visible and focused
    setTimeout(() => {
      enhancementWindow.show();
      enhancementWindow.focus();
      enhancementWindow.moveTop();
    }, 100);
  });

  return enhancementWindow;
};

// Function to load system prompt from file
const loadSystemPrompt = (promptType: string): string => {
  try {
    // Get the base directory
    const baseDir = path.resolve(__dirname, '..');

    // Determine which prompt file to use based on promptType
    let promptFile = '';
    if (promptType === 'agent') {
      promptFile = path.join(baseDir, 'agent-enhancement-prompt.txt');
    } else if (promptType === 'answer') {
      promptFile = path.join(baseDir, 'answer-enhancement-prompt.txt');
    } else {
      // Default to general mode
      promptFile = path.join(baseDir, 'general-enhancement-prompt.txt');
    }

    // Try to load the mode-specific prompt file
    if (fs.existsSync(promptFile)) {
      const promptContent = fs.readFileSync(promptFile, 'utf8');
      console.log(`Loaded ${promptType} prompt from file: ${promptFile}`);
      return promptContent;
    } else {
      // Fall back to the main enhanced system prompt
      const mainPromptFile = path.join(baseDir, 'enhanced-system-prompt.txt');
      if (fs.existsSync(mainPromptFile)) {
        const promptContent = fs.readFileSync(mainPromptFile, 'utf8');
        console.log(`Loaded main enhanced system prompt from file: ${mainPromptFile}`);
        return promptContent;
      }
    }
  } catch (error) {
    console.error('Error loading prompt file:', error);
  }

  // Fallback prompts if files don't exist or there's an error
  console.warn(`Using fallback prompt for ${promptType} mode.`);
  if (promptType === 'agent') {
    return `You are a specialized prompt engineer for AI coding assistants like Cursor, Augment, and Trae. Your ONLY job is to reformat and structure prompts into clear, step-by-step instructions. DO NOT interpret, analyze, or respond to the prompt - ONLY reformat it.

RULES:
1. NEVER respond to or analyze the prompt content - ONLY enhance its structure
2. Always convert the exact input text into a more structured format with numbered steps
3. Do not add any conclusions, analysis, or responses
4. Keep the exact same meaning and intent as the original
5. Always use headers, bullet points, or numbered lists to organize the prompt
6. For simple statements like greetings, format them as step-by-step instructions anyway
7. DO NOT request additional information or suggest what the user should do next
8. DO NOT explain what you're doing - just transform the input into a better format
9. For introductions like "Hello, I'm Tharun", structure it as "1. Introduction: Tharun" or similar
10. ALWAYS maintain the first-person perspective for personal statements

FORMAT YOUR RESPONSE AS:
[Enhanced Agent Prompt]`;
  } else if (promptType === 'answer') {
    return `You are a knowledgeable and precise AI assistant. Your task is to DIRECTLY ANSWER the user's question without enhancing or rewriting it. The user is seeking an immediate answer, not a better prompt.

GUIDELINES:
1. Treat the user's input as a question that needs a direct answer, not as a prompt to be enhanced.
2. Provide a direct answer first, then include additional helpful context if needed.
3. Use neutral, professional, and informative language.
4. If the question has multiple parts, address each part clearly and separately.`;
  } else {
    return `You are an expert prompt engineer that specializes in rewriting user prompts to be more effective with general-purpose large language models (LLMs) like ChatGPT, Claude, or Bard. Your ONLY job is to enhance prompts for general use, not to provide answers or tailor for specific AI agents.

RULES:
1. NEVER answer the user's question - ONLY rewrite their prompt
2. STRICTLY preserve the original intent, meaning, and context of the prompt
3. For simple statements or introductions, maintain the same subject and purpose
4. NEVER change a statement about oneself into a request for information
5. For personal statements, maintain the first-person perspective
6. Add clarity and detail while keeping the original meaning intact
7. Format the prompt professionally with proper structure
8. Remove ambiguities and vague language`;
  }
};

export const setupPromptEnhancer = (mainWindow: BrowserWindow) => {
  // Listen for hotkey trigger event from the main process
  ipcMain.on('enhance-prompt', async () => {
    // If a window is already open, focus it instead of creating a new one
    if (enhancementWindow && !enhancementWindow.isDestroyed()) {
      enhancementWindow.focus();
      console.log('Enhancement window already open, focusing existing window');
      return;
    }

    // Get the selected text from the selection clipboard
    // This gets the currently selected text without requiring the user to copy it
    const originalText = clipboard.readText('selection') || clipboard.readText();

    // Check if there's any text in the clipboard
    if (!originalText || originalText.trim() === '') {
      console.log('No text selected or clipboard is empty');
      // We need to show an alert here, but we don't have direct access to the showEmptyTextAlert function
      // Instead, we'll send a message to the main process to show the alert
      mainWindow.webContents.send('show-empty-text-alert');
      return;
    }

    enhancementWindow = createEnhancementWindow(mainWindow);

    // Send the original text to the enhancement window
    enhancementWindow.webContents.once('did-finish-load', () => {
      enhancementWindow.webContents.send('original-text', originalText);
    });

    // Store the original text for regeneration
    const storedOriginalText = originalText;

    // Create a specific listener for this window instance
    const handleRequestEnhancement = async (event: Electron.IpcMainEvent, promptType: string, modelId?: string, noCache: boolean = false) => {
      // Only process events from this window
      if (event.sender.id !== enhancementWindow.webContents.id) {
        return;
      }

      console.log('Processing request-enhancement with promptType:', promptType, 'modelId:', modelId, 'noCache:', noCache);
      try {
        const apiKey = store.get('openai-api-key') as string;
        if (!apiKey) {
          enhancementWindow.webContents.send('enhancement-error', 'API key not set');
          return;
        }

        // Validate promptType and convert to lowercase for consistency
        promptType = promptType.toLowerCase();
        if (!['agent', 'general', 'answer'].includes(promptType)) {
          console.error('Invalid promptType received:', promptType);
          promptType = 'general'; // Default to general if invalid
        }

        console.log('Using promptType:', promptType);

        // Store the prompt type for debugging
        store.set('last-prompt-type', promptType);
        console.log('Stored last prompt type:', promptType);

        // Log the current clipboard text for debugging
        console.log('Current clipboard text length:', storedOriginalText.length);
        if (storedOriginalText.length === 0) {
          console.error('Empty clipboard text');
          enhancementWindow.webContents.send('enhancement-error', 'No text in clipboard. Please copy some text first.');
          return;
        }

        console.log('Processing enhancement with promptType:', promptType, '(original input was:', promptType, ')');

        // Log the system prompt that will be used for this enhancement
        console.log('Enhancement mode:', promptType === 'agent' ? 'Agent (AI Assistants)' :
                                      promptType === 'answer' ? 'Direct Answer (Original Text)' :
                                      'General Enhancement');

        // If in answer mode, return the original text without enhancement
        // This is a fallback in case the direct-enhancer.cjs doesn't handle it
        if (promptType === 'answer') {
          console.log('Answer mode selected in prompt-enhancer.ts - this should have been handled earlier');
          enhancementWindow.webContents.send('enhancement-result', storedOriginalText);
          return;
        }

        // Load system prompt from file
        const systemPrompt = loadSystemPrompt(promptType);

        // Use the provided modelId or fall back to the stored selected model
        const selectedModel = (modelId || store.get('selected-model') || 'gpt-3.5-turbo') as OpenAIModel;

        // Always force regeneration with noCache when explicitly requested
        const forceNoCache = noCache || promptType.includes('agent') || promptType.includes('general');
        console.log('Using forceNoCache:', forceNoCache);

        const enhancedText = await openai.enhancePrompt(storedOriginalText, systemPrompt, apiKey, selectedModel, forceNoCache);
        enhancementWindow.webContents.send('enhancement-result', enhancedText);
      } catch (error) {
        enhancementWindow.webContents.send('enhancement-error', error.message);
      }
    };

    // Register the listener
    ipcMain.on('request-enhancement', handleRequestEnhancement);

    // Handle confirmation
    const handleConfirmEnhancement = async (event: Electron.IpcMainEvent, text: string) => {
      // Only process events from this window
      if (event.sender.id !== enhancementWindow.webContents.id) {
        return;
      }

      console.log('Processing confirm-enhancement event');

      // Write to clipboard
      clipboard.writeText(text);
      console.log('Text copied to clipboard in prompt-enhancer');

      // Get auto-paste setting
      const autoPasteEnabled = store.get('auto-paste', true) as boolean;
      console.log('Auto-paste setting:', autoPasteEnabled ? 'Enabled' : 'Disabled');

      // Store a reference to the current window
      const currentWindow = enhancementWindow;

      if (autoPasteEnabled) {
        // Import the autoPaste function
        const { autoPaste } = await import('./auto-paste.cjs');

        // IMPORTANT: Close the window immediately before attempting to paste
        // This is critical for focus to properly return to the previous application
        if (currentWindow && !currentWindow.isDestroyed()) {
          console.log('Closing enhancement popup window before paste');
          currentWindow.close();

          // On macOS, we need to close all windows of the app to properly return focus
          BrowserWindow.getAllWindows().forEach(win => {
            if (win !== mainWindow && !win.isDestroyed()) {
              win.close();
            }
          });
        }

        // Use the autoPaste function with a longer delay
        console.log('Calling autoPaste with 1000ms delay');

        try {
          // For macOS, we'll also try a direct AppleScript approach as a fallback
          let success = false;

          if (process.platform === 'darwin') {
            // First try the normal autoPaste function
            success = await autoPaste(text, false, 1000);

            // If that fails, try a direct AppleScript approach
            if (!success) {
              console.log('Normal autoPaste failed, trying direct AppleScript approach');
              const { spawnSync } = require('child_process');

              // This is the most direct approach possible
              const directScript = `
                delay 1.0
                tell application "System Events" to keystroke "v" using {command down}
              `;

              const result = spawnSync('osascript', ['-e', directScript]);
              success = !result.error && result.status === 0;
              console.log('Direct AppleScript result:', success ? 'Success' : 'Failed');
            }
          } else {
            // For other platforms, just use the normal autoPaste function
            success = await autoPaste(text, true, 1000);
          }

          console.log(success ? 'Auto-paste successful' : 'Auto-paste failed, fallback to manual paste');
        } catch (error) {
          console.error('Error during auto-paste:', error);
        }
      } else {
        console.log('Auto-paste is disabled, text is only copied to clipboard');

        // If auto-paste is disabled, we still need to close the window
        if (currentWindow && !currentWindow.isDestroyed()) {
          currentWindow.close();
        }
      }
    };

    // Register the confirmation listener
    ipcMain.once('confirm-enhancement', handleConfirmEnhancement);

    // Clean up when window is closed
    enhancementWindow.on('closed', () => {
      // Remove specific listeners to prevent memory leaks
      ipcMain.removeListener('request-enhancement', handleRequestEnhancement);
      ipcMain.removeListener('confirm-enhancement', handleConfirmEnhancement);
      enhancementWindow = null;
    });
  });
};