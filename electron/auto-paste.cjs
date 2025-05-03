// Fixed version of auto-paste.cjs
const { clipboard, Notification } = require('electron');
const { spawnSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Attempts to auto-paste text into the currently focused application
 * Falls back to a notification if auto-paste fails
 * @param {string} text - The text to paste
 * @param {boolean} showNotification - Whether to show a notification on success/failure
 * @returns {boolean} - Whether the paste was successful
 */
async function autoPaste(text, showNotification = true) {
  // First, copy the text to clipboard
  clipboard.writeText(text);
  
  let success = false;
  
  try {
    switch (process.platform) {
      case 'darwin':
        // macOS implementation using AppleScript
        success = macOSPaste();
        break;
      case 'win32':
        // Windows implementation
        success = windowsPaste();
        break;
      case 'linux':
        // Linux implementation
        success = linuxPaste();
        break;
      default:
        console.warn(`Auto-paste not supported on platform: ${process.platform}`);
    }
  } catch (error) {
    console.error('Auto-paste error:', error);
    success = false;
  }
  
  // Show notification based on outcome
  if (showNotification) {
    if (success) {
      new Notification({
        title: 'Prompt Pasted',
        body: 'Enhanced prompt has been automatically pasted'
      }).show();
    } else {
      // Fall back to manual paste notification
      new Notification({
        title: 'Prompt Copied',
        body: `Press ${process.platform === 'darwin' ? '⌘V' : 'Ctrl+V'} to paste your enhanced prompt`
      }).show();
    }
  }
  
  return success;
}

/**
 * macOS paste implementation using AppleScript
 */
function macOSPaste() {
  try {
    // This improved AppleScript ensures we're pasting to the frontmost application
    // Rather than just sending ⌘V, this script activates the frontmost app first
    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        tell application frontApp to activate
        delay 0.1
        keystroke "v" using {command down}
      end tell
    `;
    
    const result = spawnSync('osascript', ['-e', script]);
    
    if (result.error || result.status !== 0) {
      console.warn('AppleScript paste error:', result.error || result.stderr.toString());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('macOS paste error:', error);
    return false;
  }
}

/**
 * Windows paste implementation
 * Uses a more reliable approach by focusing the previous window first
 */
function windowsPaste() {
  try {
    // First attempt - Native module approach
    try {
      const nativeModulePath = path.join(__dirname, 'win-paste.node');
      if (fs.existsSync(nativeModulePath)) {
        // Use the native module
        const winPaste = require(nativeModulePath);
        winPaste.sendCtrlV();
        return true;
      }
    } catch (nativeError) {
      console.warn('Native module paste failed:', nativeError);
    }
    
    // Second attempt - Using PowerShell to ensure proper window focus
    try {
      const powershellScript = `
        Add-Type -AssemblyName System.Windows.Forms
        Start-Sleep -Milliseconds 200
        [System.Windows.Forms.SendKeys]::SendWait("^v")
      `;
      
      execSync(`powershell -Command "${powershellScript}"`, { windowsHide: true });
      return true;
    } catch (powershellError) {
      console.warn('PowerShell paste failed:', powershellError);
    }
    
    // Third attempt - AutoHotKey fallback
    const ahkPath = path.join(__dirname, 'bin', 'autohotkey.exe');
    const scriptPath = path.join(__dirname, 'bin', 'paste.ahk');
    
    if (fs.existsSync(ahkPath) && fs.existsSync(scriptPath)) {
      const result = spawnSync(ahkPath, [scriptPath], { windowsHide: true });
      
      if (!result.error && result.status === 0) {
        return true;
      }
    }
    
    // If we reach here, paste failed
    return false;
  } catch (error) {
    console.error('Windows paste error:', error);
    return false;
  }
}

/**
 * Linux paste implementation using xdotool or ydotool
 * Improved to ensure we're pasting to the correct window
 */
function linuxPaste() {
  try {
    // First, let's try to focus the previous window
    spawnSync('sh', [
      '-c',
      'xdotool getactivewindow windowfocus || true'
    ]);
    
    // Short delay to ensure window is focused
    spawnSync('sleep', ['0.1']);
    
    // Then send paste command
    const result = spawnSync('sh', [
      '-c',
      'xdotool key --clearmodifiers ctrl+v || ydotool key 29 47'
    ]);
    
    if (result.error || result.status !== 0) {
      console.warn('Linux paste error:', result.error || result.stderr.toString());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Linux paste error:', error);
    return false;
  }
}

/**
 * Check if the app has the necessary permissions for auto-paste
 * On macOS, this involves checking for Accessibility permissions
 * @returns {Promise<boolean>} - Whether the app has the necessary permissions
 */
async function checkPastePermissions() {
  if (process.platform === 'darwin') {
    try {
      // Try a test paste to a temporary file to see if we have permissions
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, 'paste-test.txt');
      
      // Create a simple AppleScript to test if we have permissions
      const testScript = `
        tell application "System Events" to keystroke "test"
      `;
      
      const result = spawnSync('osascript', ['-e', testScript], {
        timeout: 1000, // 1 second timeout
      });
      
      return !result.error && result.status === 0;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }
  
  // For other platforms, assume we have permissions until proven otherwise
  return true;
}

/**
 * Guide the user through setting up permissions for auto-paste
 * @returns {Promise<void>}
 */
async function setupPastePermissions() {
  if (process.platform === 'darwin') {
    // On macOS, we need to guide the user to grant Accessibility permissions
    const { dialog } = require('electron');
    
    dialog.showMessageBox({
      type: 'info',
      title: 'Accessibility Permissions Required',
      message: 'For auto-paste to work, you need to grant Accessibility permissions.',
      detail: 'The app will now open System Preferences. Please add this app to the list of apps allowed to control your computer.',
      buttons: ['Open System Preferences', 'Cancel'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) {
        // Open System Preferences at the Accessibility pane
        spawnSync('open', ['x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility']);
      }
    });
  }
}

// Fix for pasting in background
function backgroundPaste() {
  // First, we need to determine what application had focus before enhancing
  let frontmostApp = '';
  
  if (process.platform === 'darwin') {
    try {
      // Get frontmost app name on macOS
      const result = spawnSync('osascript', [
        '-e', 'tell application "System Events" to get name of first application process whose frontmost is true'
      ]);
      frontmostApp = result.stdout.toString().trim();
    } catch (error) {
      console.error('Error getting frontmost app:', error);
    }
  }
  
  // Write the text to clipboard
  const text = clipboard.readText();
  
  // Short delay to ensure the clipboard has been updated
  setTimeout(() => {
    if (process.platform === 'darwin' && frontmostApp) {
      // On macOS, activate the previously frontmost app and paste
      const script = `
        tell application "${frontmostApp}" to activate
        delay 0.2
        tell application "System Events" to keystroke "v" using {command down}
      `;
      spawnSync('osascript', ['-e', script]);
    } else {
      // On other platforms, just try the regular paste
      autoPaste(text, false);
    }
  }, 300);
}

module.exports = {
  autoPaste,
  checkPastePermissions,
  setupPastePermissions,
  backgroundPaste // Export the new function
};