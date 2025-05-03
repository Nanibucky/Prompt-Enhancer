// electron/basic-app.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  // Check if window already exists
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return mainWindow;
  }

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

  // Handle window close event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Setup basic IPC handlers - safely register them
  // First, remove any existing handlers to avoid the "second handler" error
  try { ipcMain.removeHandler('get-api-key'); } catch (e) {}
  try { ipcMain.removeHandler('set-api-key'); } catch (e) {}
  try { ipcMain.removeHandler('remove-api-key'); } catch (e) {}
  try { ipcMain.removeHandler('get-auto-paste'); } catch (e) {}
  try { ipcMain.removeHandler('toggle-auto-paste'); } catch (e) {}

  // Now register the handlers
  ipcMain.handle('get-api-key', () => {
    return 'dummy-api-key-for-testing';
  });

  ipcMain.handle('set-api-key', (_, apiKey) => {
    console.log('API key set:', apiKey);
    return true;
  });

  ipcMain.handle('remove-api-key', () => {
    console.log('API key removed');
    return true;
  });

  ipcMain.handle('get-auto-paste', () => {
    return true;
  });

  ipcMain.handle('toggle-auto-paste', () => {
    return true;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
