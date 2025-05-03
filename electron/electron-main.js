// electron/electron-main.js
const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');
const ElectronStore = require('electron-store');
const { setupPromptEnhancer } = require('./dist/prompt-enhancer');

const store = new ElectronStore();

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

  mainWindow.loadFile('dist/index.html');

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

  // Setup the prompt enhancer
  setupPromptEnhancer(mainWindow);
}

app.whenReady().then(() => {
  createWindow();

  // Register global shortcut
  // Mac: Cmd+Space+Space, Windows/Linux: Ctrl+Space+Space
  const shortcut = process.platform === 'darwin' ? 'CommandOrControl+Space+Space' : 'CommandOrControl+Space+Space';
  globalShortcut.register(shortcut, () => {
    ipcMain.emit('enhance-prompt');
  });

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