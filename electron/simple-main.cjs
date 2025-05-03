// electron/simple-main.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ElectronStore = require('electron-store');

// Initialize the store with encryption
const store = new ElectronStore({
  encryptionKey: 'prompt-enhancer-secure-key-123'
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  // In development, load from the dev server
  mainWindow.loadURL('http://localhost:8080');

  // Setup IPC handlers
  ipcMain.handle('get-api-key', () => {
    return store.get('openai-api-key', '');
  });

  ipcMain.handle('set-api-key', (_, apiKey) => {
    store.set('openai-api-key', apiKey);
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
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
