// electron/alert-utils.cjs
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// Track if a login alert is currently showing
let loginAlertShowing = false;

// Track if an empty text alert is currently showing
let emptyTextAlertShowing = false;

// Export the alert state flags
const getLoginAlertShowing = () => loginAlertShowing;

// Helper function to show login alert
function showLoginAlert(mainWindow) {
  if (!mainWindow) {
    console.error('showLoginAlert called with no mainWindow');
    return;
  }

  console.log('ALERT: showLoginAlert called with mainWindow:', mainWindow.id);

  // Force close any existing login alert window
  if (loginAlertShowing) {
    console.log('ALERT: Login alert flag was set, forcing a new alert');
    loginAlertShowing = false;
  }

  // Set the flag immediately to prevent multiple alerts
  loginAlertShowing = true;

  // ALWAYS show the main window and bring it to front
  console.log('ALERT: Showing main window and bringing to front for login alert');
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
  mainWindow.moveTop();

  // Get the selected provider to determine which page to navigate to
  const selectedProvider = global.store ? global.store.get('selected-provider', 'openai') : 'openai';
  console.log(`ALERT: Selected provider for navigation: ${selectedProvider}`);

  // Create a small notification window - make it non-modal so it doesn't block the main window
  // but set show:true to make it visible immediately
  const notificationWindow = new BrowserWindow({
    width: 400,
    height: 280,
    show: true, // Show immediately
    parent: mainWindow,
    modal: false,
    frame: true,
    resizable: false,
    alwaysOnTop: true,
    backgroundColor: '#ffffff',
    titleBarStyle: 'hiddenInset',
    center: true, // Center the window on the screen
    skipTaskbar: false, // Show in taskbar to make it more visible
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Get the selected provider to customize the message
  // Using the selectedProvider variable already declared above
  const providerName = selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI';
  const providerColor = selectedProvider === 'gemini' ? '#1a73e8' : '#4f46e5'; // Blue for Gemini, Purple for OpenAI
  const gradientStart = selectedProvider === 'gemini' ? '#1a73e8' : '#6366f1';
  const gradientEnd = selectedProvider === 'gemini' ? '#34a853' : '#8b5cf6';

  // Create HTML content for the notification
  const notificationContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>API Key Required</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      body {
        font-family: 'Poppins', sans-serif;
        padding: 0;
        text-align: center;
        background: linear-gradient(135deg, ${gradientStart}, ${gradientEnd});
        color: #333;
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        box-sizing: border-box;
        overflow: hidden;
      }
      .container {
        max-width: 340px;
        background-color: rgba(255, 255, 255, 0.95);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        animation: fadeIn 0.5s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      h2 {
        color: ${providerColor};
        margin-top: 0;
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      p {
        margin: 12px 0;
        color: #4b5563;
        line-height: 1.4;
        font-size: 14px;
        font-weight: 400;
      }
      .buttons {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-top: 15px;
      }
      button {
        background: linear-gradient(to right, ${gradientStart}, ${gradientEnd});
        color: white;
        padding: 10px 18px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.3s ease;
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
        flex: 1;
      }
      button:hover {
        background: linear-gradient(to right, ${gradientStart}, ${gradientEnd});
        filter: brightness(0.9);
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
      }
      button.secondary {
        background: linear-gradient(to right, #9ca3af, #6b7280);
        box-shadow: 0 3px 8px rgba(107, 114, 128, 0.3);
      }
      button.secondary:hover {
        background: linear-gradient(to right, #6b7280, #4b5563);
        box-shadow: 0 4px 10px rgba(107, 114, 128, 0.4);
      }
      .icon {
        font-size: 48px;
        margin-bottom: 12px;
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      .highlight {
        color: ${providerColor};
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">⚠️</div>
      <h2>Login Required</h2>
      <p>Please <span class="highlight">set your ${providerName} API key</span> to use the enhancement feature.</p>
      <p style="color: #e11d48; font-weight: 500;">You must log in before using the hotkey!</p>
      <div class="buttons">
        <button onclick="window.close()">OK</button>
      </div>
    </div>
    <script>
      // Add event listener to ensure buttons work properly
      document.addEventListener('DOMContentLoaded', () => {
        const okButton = document.querySelector('button');
        if (okButton) {
          okButton.addEventListener('click', () => {
            window.close();
          });
        }
      });
    </script>
  </body>
  </html>
  `;

  // Write the content to a temporary file
  const loginNotificationPath = path.join(app.getPath('temp'), 'login-notification.html');
  fs.writeFileSync(loginNotificationPath, notificationContent);

  // Set the window to be always on top with highest priority before loading content
  notificationWindow.setAlwaysOnTop(true, 'screen-saver');

  // Load the notification content
  notificationWindow.loadFile(loginNotificationPath);

  console.log('ALERT: Login notification window created and content loaded');

  // Make sure the window is visible and focused
  notificationWindow.show();
  notificationWindow.focus();
  notificationWindow.moveTop();

  // Double-check visibility immediately
  setTimeout(() => {
    if (!notificationWindow.isDestroyed()) {
      console.log('ALERT: Reinforcing login alert window visibility (first check)');
      notificationWindow.show();
      notificationWindow.focus();
      notificationWindow.setAlwaysOnTop(true, 'screen-saver');
      notificationWindow.moveTop();
    }
  }, 100);

  // Check again after a slightly longer delay
  setTimeout(() => {
    if (!notificationWindow.isDestroyed()) {
      console.log('ALERT: Reinforcing login alert window visibility (second check)');
      notificationWindow.show();
      notificationWindow.focus();
      notificationWindow.setAlwaysOnTop(true, 'screen-saver');
      notificationWindow.moveTop();
    }
  }, 500);

  // Also handle the ready-to-show event as a backup
  notificationWindow.once('ready-to-show', () => {
    console.log('ALERT: Login notification window ready to show');
    if (!notificationWindow.isDestroyed()) {
      notificationWindow.show();
      notificationWindow.focus();
      notificationWindow.setAlwaysOnTop(true, 'screen-saver');
      notificationWindow.moveTop();
    }

    // Set a timeout to automatically close the window after 60 seconds
    // This prevents the window from staying open indefinitely if the user doesn't interact with it
    setTimeout(() => {
      if (!notificationWindow.isDestroyed()) {
        notificationWindow.close();
      }
    }, 60000); // 60 seconds to give user plenty of time to notice
  });

  // Reset the flag when the window is closed
  notificationWindow.on('closed', () => {
    console.log('Login alert window closed, resetting flag');
    loginAlertShowing = false;
  });

  // Handle window blur event - don't close immediately to give user time to notice
  notificationWindow.on('blur', () => {
    console.log('ALERT: Login notification window lost focus');

    // Keep the window visible for a few seconds after losing focus
    // This gives the user more time to notice the alert
    setTimeout(() => {
      if (!notificationWindow.isDestroyed()) {
        console.log('ALERT: Bringing login alert window back to focus');
        // Bring window back to focus one more time to ensure user sees it
        notificationWindow.setAlwaysOnTop(true, 'screen-saver');
        notificationWindow.show();
        notificationWindow.focus();
        notificationWindow.moveTop();

        // Then close after a longer delay
        setTimeout(() => {
          if (!notificationWindow.isDestroyed()) {
            console.log('ALERT: Closing login alert window after delay');
            notificationWindow.close();
          }
        }, 5000); // Close 5 seconds after bringing back to focus (increased from 3s)
      }
    }, 3000); // Wait 3 seconds after blur before bringing back to focus (increased from 2s)
  });

  // Send navigation message to main window after a delay to ensure alert is shown first
  setTimeout(() => {
    try {
      if (selectedProvider === 'gemini') {
        console.log('ALERT: Navigating to setup page for Gemini API key');
        mainWindow.webContents.send('navigate-to-setup');
      } else {
        console.log('ALERT: Navigating to login page for OpenAI');
        mainWindow.webContents.send('navigate-to-login');
      }
    } catch (error) {
      console.error('ALERT: Error sending navigation message:', error);
      // Fallback to login page if navigation fails
      try {
        mainWindow.webContents.send('navigate-to-login');
      } catch (fallbackError) {
        console.error('ALERT: Error sending fallback navigation message:', fallbackError);
      }
    }
  }, 1000); // Wait 1 second before navigating to ensure alert is shown first
}

// Helper function to show empty text alert
function showEmptyTextAlert(mainWindow) {
  if (!mainWindow) return;

  // Reset the flag if it's already set but the window might have been closed
  if (emptyTextAlertShowing) {
    console.log('Empty text alert flag was set, resetting it to allow new alert');
    emptyTextAlertShowing = false;
  }

  emptyTextAlertShowing = true;

  // Create a small notification window
  const emptyTextWindow = new BrowserWindow({
    width: 450,
    height: 250,
    show: false,
    parent: mainWindow,
    modal: true,
    frame: true,
    resizable: false,
    alwaysOnTop: true,
    backgroundColor: '#ffffff',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Create HTML content for the notification
  const emptyTextContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>No Text Selected</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      body {
        font-family: 'Poppins', sans-serif;
        padding: 30px;
        text-align: center;
        background: linear-gradient(135deg, #f97316, #f43f5e);
        color: #333;
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        box-sizing: border-box;
      }
      .container {
        max-width: 400px;
        background-color: rgba(255, 255, 255, 0.95);
        border-radius: 16px;
        padding: 30px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        animation: fadeIn 0.5s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      h2 {
        color: #f43f5e;
        margin-top: 0;
        font-size: 28px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      p {
        margin: 20px 0;
        color: #4b5563;
        line-height: 1.6;
        font-size: 16px;
        font-weight: 400;
      }
      button {
        background: linear-gradient(to right, #f97316, #f43f5e);
        color: white;
        padding: 14px 28px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: all 0.3s ease;
        margin-top: 15px;
        box-shadow: 0 4px 10px rgba(244, 63, 94, 0.3);
      }
      button:hover {
        background: linear-gradient(to right, #ea580c, #e11d48);
        transform: translateY(-3px);
        box-shadow: 0 6px 15px rgba(244, 63, 94, 0.4);
      }
      .icon {
        font-size: 64px;
        margin-bottom: 20px;
        animation: pulse 2s infinite;
      }
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      .highlight {
        color: #f43f5e;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">📋</div>
      <h2>No Text Selected</h2>
      <p>Please <span class="highlight">select some text</span> before using the enhancement feature.</p>
      <button onclick="window.close()">Got it</button>
    </div>
  </body>
  </html>
  `;

  // Write the content to a temporary file
  const tempPath = path.join(app.getPath('temp'), 'empty-text-notification.html');
  fs.writeFileSync(tempPath, emptyTextContent);

  // Load the notification content
  emptyTextWindow.loadFile(tempPath);

  // Show the window when ready
  emptyTextWindow.once('ready-to-show', () => {
    emptyTextWindow.show();
    emptyTextWindow.focus();
  });

  // Reset the flag when the window is closed
  emptyTextWindow.on('closed', () => {
    emptyTextAlertShowing = false;
  });
}

module.exports = {
  showLoginAlert,
  showEmptyTextAlert,
  getLoginAlertShowing
};
