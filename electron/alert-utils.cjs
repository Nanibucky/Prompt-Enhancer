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
  if (!mainWindow) return;

  // Force close any existing login alert window
  if (loginAlertShowing) {
    console.log('Login alert flag was set, forcing a new alert');
    loginAlertShowing = false;
  }

  // If the main window is already visible, bring it to front AND show the login alert
  if (mainWindow.isVisible()) {
    console.log('Main window visible, bringing to front and showing login alert');
    mainWindow.focus();
    // Send a message to the renderer to navigate to login if needed
    mainWindow.webContents.send('navigate-to-login');
  }

  // Always show the login alert
  loginAlertShowing = true;

  // Create a small notification window - make it non-modal so it doesn't block the main window
  const notificationWindow = new BrowserWindow({
    width: 380,
    height: 250,
    show: false,
    parent: mainWindow,
    modal: false, // Changed from true to false to make it non-modal
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
  const notificationContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Login Required</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

      body {
        font-family: 'Poppins', sans-serif;
        padding: 0;
        text-align: center;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
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
        color: #4f46e5;
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
        background: linear-gradient(to right, #4f46e5, #7c3aed);
        color: white;
        padding: 10px 18px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.3s ease;
        box-shadow: 0 3px 8px rgba(79, 70, 229, 0.3);
        flex: 1;
      }
      button:hover {
        background: linear-gradient(to right, #4338ca, #6d28d9);
        transform: translateY(-2px);
        box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4);
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
        color: #4f46e5;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon">🔐</div>
      <h2>API Key Required</h2>
      <p>Please <span class="highlight">set your API key</span> to use the enhancement feature.</p>
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

  // Load the notification content
  notificationWindow.loadFile(loginNotificationPath);

  // Show the window when ready
  notificationWindow.once('ready-to-show', () => {
    notificationWindow.show();
    notificationWindow.focus();

    // Ensure the window is always on top
    notificationWindow.setAlwaysOnTop(true, 'floating');
    notificationWindow.moveTop();

    // Set a timeout to automatically close the window after 30 seconds
    // This prevents the window from staying open indefinitely if the user doesn't interact with it
    setTimeout(() => {
      if (!notificationWindow.isDestroyed()) {
        notificationWindow.close();
      }
    }, 30000);
  });

  // Reset the flag when the window is closed
  notificationWindow.on('closed', () => {
    console.log('Login alert window closed, resetting flag');
    loginAlertShowing = false;
  });

  // Handle window blur event - close the window when it loses focus
  notificationWindow.on('blur', () => {
    // Small delay to allow for button clicks to register
    setTimeout(() => {
      if (!notificationWindow.isDestroyed()) {
        notificationWindow.close();
      }
    }, 100);
  });
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
