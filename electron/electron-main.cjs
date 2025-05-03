// electron/electron-main.cjs
const { app, BrowserWindow, globalShortcut, ipcMain, clipboard, protocol } = require('electron');
const localShortcut = require('electron-localshortcut');
const fs = require('fs');
const path = require('path');
const { showLoginAlert, showEmptyTextAlert, getLoginAlertShowing } = require('./alert-utils.cjs');
const { showDirectEnhancementPopup, getDirectEnhancementPopupShowing } = require('./direct-enhancer.cjs');
const { spawnSync } = require('child_process');

// Function to pause for a specified amount of time
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Variable to store the last used text for regeneration
let lastUsedText = '';
// Make it available globally
global.lastUsedText = '';

// Function to process regeneration in an existing window
async function processRegenerationInExistingWindow(window, store, requestedMode = null, checkClipboard = false) {
  try {
    console.log('processRegenerationInExistingWindow called with mode:', requestedMode, 'checkClipboard:', checkClipboard);

    // Get the API key
    const apiKey = store.get('openai-api-key', '');
    if (!apiKey) {
      console.error('No API key found');
      return;
    }

    // Get the selected model
    const selectedModel = store.get('selected-model', 'gpt-4o-mini');

    // Always get the current text from clipboard for regeneration if checkClipboard is true
    let textToEnhance;
    if (checkClipboard) {
      textToEnhance = clipboard.readText('selection') || clipboard.readText();
      console.log('Using text from clipboard for regeneration:', textToEnhance ? textToEnhance.substring(0, 50) + '...' : 'No text found');
    } else {
      // Use the last used text if available
      textToEnhance = global.lastUsedText || '';
      if (!textToEnhance || textToEnhance.trim() === '') {
        // Fall back to clipboard if no cached text is available
        textToEnhance = clipboard.readText('selection') || clipboard.readText();
        console.log('No cached text, falling back to clipboard:', textToEnhance ? textToEnhance.substring(0, 50) + '...' : 'No text found');
      } else {
        console.log('Using cached text for regeneration:', textToEnhance ? textToEnhance.substring(0, 50) + '...' : 'No text found');
      }
    }

    // Check if the text is empty
    if (!textToEnhance || textToEnhance.trim() === '') {
      console.error('No text found in clipboard');
      // Show error in the window
      window.webContents.executeJavaScript(`
        document.getElementById('enhancedText').innerHTML = '<div style="color: #b91c1c; padding: 10px; background-color: #fee2e2; border-radius: 6px;">No text found in clipboard. Please copy some text and try again.</div>';
      `);
      // Also show the empty text alert
      showEmptyTextAlert(mainWindow);
      return;
    }

    // Store this text for reference
    global.lastUsedText = textToEnhance;

    // Determine the mode to use
    let mode = requestedMode;
    if (!mode || !['agent', 'general', 'answer'].includes(mode)) {
      // Try to get the mode from the URL
      try {
        const urlObj = new URL(window.webContents.getURL());
        const urlMode = urlObj.searchParams.get('mode');
        if (urlMode && ['agent', 'general', 'answer'].includes(urlMode)) {
          mode = urlMode;
          console.log('Using mode from URL:', mode);
        } else {
          // Try to get the mode from the window's JavaScript context
          const currentTab = await window.webContents.executeJavaScript('typeof currentTab !== "undefined" ? currentTab : null');
          if (currentTab && ['agent', 'general', 'answer'].includes(currentTab)) {
            mode = currentTab;
            console.log('Using mode from window context:', mode);
          } else {
            // Default to general mode
            mode = 'general';
            console.log('No valid mode found, defaulting to general mode');
          }
        }
      } catch (error) {
        console.error('Error determining mode, defaulting to general:', error);
        mode = 'general';
      }
    } else {
      console.log('Using provided mode:', mode);
    }

    // Update the mode in the window's JavaScript context
    try {
      await window.webContents.executeJavaScript(`currentTab = "${mode}";`);
      console.log('Updated currentTab in window to:', mode);
    } catch (error) {
      console.error('Error updating currentTab in window:', error);
    }

    // Show loading state with appropriate message based on mode
    const loadingMessage = mode === 'agent' ? 'Regenerating agent prompt...' :
                         mode === 'answer' ? 'Generating new answer...' :
                         'Regenerating enhanced prompt...';

    const loadingHTML = `
      <div style="text-align: center;">
        <div style="border: 4px solid rgba(0, 0, 0, 0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #4f46e5; animation: spin 1s linear infinite; margin: 20px auto;"></div>
        <p>${loadingMessage}</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    // Update the window content to show loading
    window.webContents.executeJavaScript(`
      document.getElementById('enhancedText').innerHTML = \`${loadingHTML}\`;
    `);

    // Import the enhanceText function from direct-enhancer.cjs
    const { enhanceText } = require('./direct-enhancer.cjs');

    console.log(`Using ${mode} enhancement mode for regeneration`);

    // Always force regeneration without caching when using the regenerate button
    const noCache = true;
    console.log('Forcing regeneration without cache in processRegenerationInExistingWindow');

    // Enhance the text with the specified mode and no caching
    const enhancedText = await enhanceText(textToEnhance, apiKey, selectedModel, mode, noCache);

    // Update the window content with the enhanced text
    window.webContents.executeJavaScript(`
      document.getElementById('enhancedText').innerText = \`${enhancedText.replace(/`/g, '\\`')}\`;
    `);
  } catch (error) {
    console.error('Error processing regeneration:', error);

    // Show error message in the window
    window.webContents.executeJavaScript(`
      document.getElementById('enhancedText').innerHTML = '<div style="color: #b91c1c; padding: 10px; background-color: #fee2e2; border-radius: 6px;">Error regenerating prompt: ${error.message.replace(/'/g, "\\'")}</div>';
    `);
  }
}

// Function to process new text in an existing window has been removed

// Create a simple in-memory store for API keys and settings
const store = {
  data: {
    'keyboard-shortcut': process.platform === 'darwin' ? 'CommandOrControl+Space+Space' : 'CommandOrControl+Space+Space'
  },
  get: (key, defaultValue) => {
    return key in store.data ? store.data[key] : defaultValue;
  },
  set: (key, value) => {
    store.data[key] = value;
  },
  delete: (key) => {
    delete store.data[key];
  }
};

// Make the store globally accessible for other modules
global.store = store;

// Import the prompt-enhancer-wrapper module (CommonJS)
const { setupPromptEnhancer } = require('./prompt-enhancer-wrapper.cjs');

// Track the current registered shortcut
let currentShortcut = null;

// Function to restore focus to the previous application and auto-paste
async function restoreFocusAndPaste() {
  try {
    // Wait a bit to ensure clipboard is ready
    await sleep(100);

    // Use different methods based on platform
    switch (process.platform) {
      case 'darwin': // macOS
        // Hide our app to return focus to the previous app
        app.hide();

        // Wait for app to be hidden
        await sleep(100);

        // Use AppleScript to paste into the active application
        const scriptToPaste = `
          tell application "System Events"
            keystroke "v" using command down
          end tell
        `;

        const pasteResult = spawnSync('osascript', ['-e', scriptToPaste]);

        if (pasteResult.error) {
          console.error('Auto-paste failed:', pasteResult.error);
        } else {
          console.log('Auto-paste executed successfully');
        }

        // No need to restore focus to the popup window
        // The protocol handler will handle showing the success message
        break;

      case 'win32': // Windows
        // Use alt+tab to switch back to the previous window
        spawnSync('powershell', ['-command',
          'Add-Type -AssemblyName System.Windows.Forms; ' +
          '[System.Windows.Forms.SendKeys]::SendWait("%{TAB}"); ' +
          'Start-Sleep -Milliseconds 200; ' +
          '[System.Windows.Forms.SendKeys]::SendWait("^v");'
        ]);
        break;

      case 'linux': // Linux
        // Try xdotool first for X11, fallback to ydotool for Wayland
        const linuxResult = spawnSync('sh', ['-c', 'xdotool key --clearmodifiers alt+Tab && sleep 0.2 && xdotool key --clearmodifiers ctrl+v || ydotool key 56 15 && sleep 0.2 && ydotool key 29 47']);

        if (linuxResult.error) {
          console.error('Auto-paste failed on Linux:', linuxResult.error);
        } else {
          console.log('Auto-paste executed successfully on Linux');
        }
        break;

      default:
        console.warn('Unsupported platform for auto-paste:', process.platform);
        break;
    }

    // Return a promise that resolves after the paste operation is complete
    return new Promise(resolve => setTimeout(resolve, 800));
  } catch (error) {
    console.error('Error in auto-paste process:', error);
    return Promise.reject(error);
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    },
  });

  console.log('Creating window and loading URL...');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // Try to load the built application - explicitly use index.html, not enhancement.html
  const indexPath = path.join(__dirname, '../dist/index.html');
  console.log('Loading index.html from:', indexPath);
  mainWindow.loadFile(indexPath)
    .then(() => {
      console.log('Successfully loaded built application');
      // Don't automatically open DevTools
      // mainWindow.webContents.openDevTools();

      // Register a cleanup function for when the window is closed
      mainWindow.on('closed', () => {
        console.log('Window closed, unregistering shortcuts');
        localShortcut.unregisterAll(mainWindow);
      });

      // Listen for console messages from the renderer process
      mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
        console.log(`[Renderer Console][${level}] ${message}`);
        if (level >= 2) { // Error or warning
          console.log(`  Source: ${sourceId}:${line}`);
        }
      });

      // Listen for preload script logs
      mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
        console.error(`Preload script error in ${preloadPath}:`, error);
      });

      // Listen for page errors
      mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
        console.error(`Page failed to load: ${errorDescription} (${errorCode})`);
      });
    })
    .catch(err => {
      console.error('Failed to load built application:', err);
    });

  // Setup IPC handlers
  ipcMain.handle('get-api-key', () => {
    return store.get('openai-api-key', '');
  });

  ipcMain.handle('set-api-key', (_, apiKey) => {
    store.set('openai-api-key', apiKey);
    return true;
  });

  ipcMain.handle('remove-api-key', () => {
    store.delete('openai-api-key');
    return true;
  });

  ipcMain.handle('get-auto-paste', () => {
    return store.get('auto-paste', true);
  });

  ipcMain.handle('toggle-auto-paste', () => {
    const currentValue = store.get('auto-paste', true);
    store.set('auto-paste', !currentValue);
    return !currentValue;
  });

  // Model selection methods
  ipcMain.handle('get-selected-model', () => {
    return store.get('selected-model', 'gpt-4o-mini');
  });

  ipcMain.handle('set-selected-model', (_, modelId) => {
    store.set('selected-model', modelId);
    return true;
  });

  ipcMain.handle('get-available-models', () => {
    return [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
      { id: 'gpt-4', name: 'GPT-4', description: 'More powerful and accurate' },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Latest model with enhanced capabilities' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Efficient version of GPT-4o with great performance' }
    ];
  });

  // Handle clipboard text refresh
  ipcMain.on('refresh-clipboard-text', (event) => {
    // Get the latest text from the selection clipboard or regular clipboard
    const latestText = clipboard.readText('selection') || clipboard.readText();
    console.log('Refreshing text from selection or clipboard:', latestText);

    // Send the latest text back to the renderer process
    event.sender.send('original-text', latestText);
  });

  // Setup the prompt enhancer
  setupPromptEnhancer(mainWindow);

  // Handle empty text alert request from prompt-enhancer.ts
  ipcMain.on('show-empty-text-alert', () => {
    console.log('Received request to show empty text alert');
    showEmptyTextAlert(mainWindow);
  });

  // Prompt Management
  ipcMain.handle('get-prompt-history', () => {
    return store.get('prompt-history', []);
  });

  ipcMain.handle('get-favorite-prompts', () => {
    return store.get('favorite-prompts', []);
  });

  ipcMain.handle('save-prompt-history', (_, prompts) => {
    store.set('prompt-history', prompts);
    return true;
  });

  ipcMain.handle('save-favorite-prompts', (_, prompts) => {
    store.set('favorite-prompts', prompts);
    return true;
  });

  // Setup IPC handlers for shortcut management
  ipcMain.handle('get-keyboard-shortcut', () => {
    return store.get('keyboard-shortcut', process.platform === 'darwin' ? 'CommandOrControl+Space+Space' : 'CommandOrControl+Space+Space');
  });

  ipcMain.handle('set-keyboard-shortcut', (_, shortcut) => {
    store.set('keyboard-shortcut', shortcut);
    // Re-register the shortcut with the new value
    registerShortcut();
    return true;
  });

  ipcMain.handle('reset-keyboard-shortcut', () => {
    const defaultShortcut = process.platform === 'darwin' ? 'CommandOrControl+Space+Space' : 'CommandOrControl+Space+Space';
    store.set('keyboard-shortcut', defaultShortcut);
    // Re-register the shortcut with the default value
    registerShortcut();
    return defaultShortcut;
  });
}

// Define the registerShortcut function
function registerShortcut() {
  try {
    // Unregister the current shortcut if it exists
    if (currentShortcut) {
      console.log(`Unregistering current shortcut: ${currentShortcut}`);
      globalShortcut.unregister(currentShortcut);
      currentShortcut = null;
    }

    // Get the new shortcut from the store
    const shortcut = store.get('keyboard-shortcut', process.platform === 'darwin' ? 'CommandOrControl+Space+Space' : 'CommandOrControl+Space+Space');

    // Try to register the shortcut
    console.log(`Attempting to register hotkey: ${shortcut}`);

    // Define the callback function
    const hotkeyCallback = () => {
      console.log(`Hotkey triggered: ${shortcut}`);
      if (mainWindow) {
        if (getDirectEnhancementPopupShowing()) {
          console.log('Direct enhancement popup already showing, skipping');
          return;
        }

        if (getLoginAlertShowing()) {
          console.log('Login alert already showing, skipping');
          return;
        }

        const apiKey = store.get('openai-api-key', '');
        if (!apiKey) {
          console.log('API key not set, showing login alert');
          showLoginAlert(mainWindow);
          return;
        }

        console.log('Showing direct enhancement popup');
        showDirectEnhancementPopup(mainWindow, store)
          .catch(error => {
            console.error('Error showing direct enhancement popup:', error);
            const { resetDirectEnhancementPopupShowing } = require('./direct-enhancer.cjs');
            if (getDirectEnhancementPopupShowing()) {
              console.log('Resetting directEnhancementPopupShowing flag due to error');
              resetDirectEnhancementPopupShowing();
            }
          });
      } else {
        console.error('Main window not available');
      }
    };

    // Register the shortcut
    const success = globalShortcut.register(shortcut, hotkeyCallback);

    if (success) {
      console.log(`Successfully registered hotkey: ${shortcut}`);
      currentShortcut = shortcut;
    } else {
      console.error(`Failed to register shortcut: ${shortcut}`);
    }
  } catch (error) {
    console.error('Error registering shortcut:', error);
  }
}

// Register custom protocol handler for confirmation
function setupProtocolHandler() {
  // Register the protocol handler
  protocol.registerStringProtocol('prompt-enhancer', (request, callback) => {
    const url = request.url;
    console.log('Custom protocol request:', url);

    // Process the request
    handleProtocolRequest(url);

    // Return an empty response
    callback({ data: '' });
  });
}

// Function to handle protocol requests (used by both protocol APIs)
function handleProtocolRequest(url) {
  if (url.startsWith('prompt-enhancer://regenerate')) {
    // Handle regeneration request
    console.log('Received regeneration request:', url);

    // Parse the URL to get the mode parameter
    const urlObj = new URL(url);
    const mode = urlObj.searchParams.get('mode') || 'general';
    console.log('Using enhancement mode:', mode);

    // Get the current text from clipboard
    const clipboardText = clipboard.readText('selection') || clipboard.readText();
    console.log('Current clipboard text for regeneration:', clipboardText ? clipboardText.substring(0, 50) + '...' : 'No text found');

    // Find the existing popup window
    const existingPopup = BrowserWindow.getAllWindows().find(win =>
      win !== mainWindow && !win.isDestroyed() && win.isVisible());

    if (existingPopup) {
      console.log('Found existing popup window, updating content with clipboard text');
      // Process the regeneration in the existing window with the specified mode
      processRegenerationInExistingWindow(existingPopup, store, mode, true);
    } else {
      console.log('No existing popup found, creating new one');
      // Pass the mode parameter to the showDirectEnhancementPopup function
      showDirectEnhancementPopup(mainWindow, store, true, mode);
    }
  } else if (url.startsWith('prompt-enhancer://confirm')) {
    // Handle confirmation request to paste
    console.log('Received confirmation request:', url);
    const urlObj = new URL(url);
    const text = urlObj.searchParams.get('text');

    if (text) {
      console.log('Confirming enhanced text:', text.substring(0, 50) + '...');
      clipboard.writeText(text);

      // Check if auto-paste is enabled
      const autoPasteEnabled = store.get('auto-paste', true);

      // Find the enhancement popup window but keep it open
      const existingPopup = BrowserWindow.getAllWindows().find(win =>
        win !== mainWindow && !win.isDestroyed() && win.isVisible());

      if (existingPopup) {
        console.log('Keeping enhancement popup window open and on top');
        // Make sure the window stays on top
        existingPopup.setAlwaysOnTop(true);

        // Show a success message in the popup window
        try {
          const message = autoPasteEnabled ? 'Text copied! Pasting...' : 'Text copied to clipboard!';
          existingPopup.webContents.executeJavaScript(
            `document.getElementById('copySuccess').innerText = "${message}";
             document.getElementById('copySuccess').classList.add('visible');`
          ).catch(err => console.error('Error showing message in popup:', err));
        } catch (err) {
          console.error('Error executing JavaScript in popup window:', err);
        }
      }

      if (autoPasteEnabled) {
        console.log('Auto-paste enabled, initiating paste process');
        // Restore focus to the previous application and auto-paste
        restoreFocusAndPaste()
          .then(() => {
            // Update the popup window with success message after paste is complete
            if (existingPopup && !existingPopup.isDestroyed()) {
              existingPopup.setAlwaysOnTop(true);
              existingPopup.show();

              // Update the success message
              existingPopup.webContents.executeJavaScript(
                `document.getElementById('copySuccess').innerText = "Text applied successfully!";
                 setTimeout(function() {
                   document.getElementById('copySuccess').classList.remove('visible');
                 }, 3000);`
              ).catch(err => console.error('Error updating success message:', err));
            }
          })
          .catch(error => {
            console.error('Error during paste operation:', error);
            // Show error message in popup
            if (existingPopup && !existingPopup.isDestroyed()) {
              existingPopup.setAlwaysOnTop(true);
              existingPopup.show();

              // Show error message
              existingPopup.webContents.executeJavaScript(
                `document.getElementById('copySuccess').innerText = "Error during paste operation";
                 document.getElementById('copySuccess').classList.add('error');
                 setTimeout(function() {
                   document.getElementById('copySuccess').classList.remove('visible', 'error');
                 }, 3000);`
              ).catch(err => console.error('Error showing error message:', err));
            }
          });
      } else {
        console.log('Auto-paste disabled, text is in clipboard');

        // If auto-paste is disabled, hide the message after a delay
        setTimeout(() => {
          if (existingPopup && !existingPopup.isDestroyed()) {
            existingPopup.webContents.executeJavaScript(
              `setTimeout(function() {
                 document.getElementById('copySuccess').classList.remove('visible');
               }, 2000);`
            ).catch(err => console.error('Error hiding message:', err));
          }
        }, 1000);
      }
    }
  }
  // New Text functionality has been removed
}

app.whenReady().then(() => {
  // Setup protocol handler for confirmation
  setupProtocolHandler();

  // Create the main window
  createWindow();

  // Register the custom shortcut
  registerShortcut();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

// Export the restoreFocusAndPaste function for use in other modules
module.exports = {
  restoreFocusAndPaste
};
