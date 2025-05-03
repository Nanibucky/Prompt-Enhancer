/**
 * This file provides web-specific implementations for functionality
 * that would normally be handled by Electron in the desktop app.
 */

// Function to simulate keyboard shortcut registration in web environment
export const registerWebShortcut = (shortcut: string, callback: () => void) => {
  // Parse the shortcut string (e.g., "CommandOrControl+Space+Space")
  const keys = shortcut.split('+');
  
  // Track key states
  const keyStates: Record<string, boolean> = {};
  
  // Handle keydown events
  const handleKeyDown = (event: KeyboardEvent) => {
    // Map CommandOrControl to the appropriate key based on platform
    if (keys.includes('CommandOrControl')) {
      if (navigator.platform.includes('Mac')) {
        keyStates['Meta'] = event.metaKey;
      } else {
        keyStates['Control'] = event.ctrlKey;
      }
    }
    
    // Map other keys
    if (keys.includes('Shift')) keyStates['Shift'] = event.shiftKey;
    if (keys.includes('Alt')) keyStates['Alt'] = event.altKey;
    
    // For regular keys, check if they're pressed
    const key = event.key.charAt(0).toUpperCase() + event.key.slice(1).toLowerCase();
    if (keys.includes(key) || keys.includes(event.key)) {
      keyStates[event.key] = true;
    }
    
    // Special case for Space key
    if (keys.includes('Space') && event.key === ' ') {
      keyStates['Space'] = true;
    }
    
    // Check if all required keys are pressed
    let allKeysPressed = true;
    for (const k of keys) {
      if (k === 'CommandOrControl') {
        const controlKey = navigator.platform.includes('Mac') ? 'Meta' : 'Control';
        if (!keyStates[controlKey]) {
          allKeysPressed = false;
          break;
        }
      } else if (k === 'Space') {
        if (!keyStates['Space']) {
          allKeysPressed = false;
          break;
        }
      } else if (!keyStates[k]) {
        allKeysPressed = false;
        break;
      }
    }
    
    // If all keys are pressed, execute the callback
    if (allKeysPressed) {
      callback();
      event.preventDefault();
    }
  };
  
  // Handle keyup events
  const handleKeyUp = (event: KeyboardEvent) => {
    // Reset key states
    if (event.key === 'Meta' || event.key === 'Control') {
      keyStates['Meta'] = false;
      keyStates['Control'] = false;
    }
    
    if (event.key === 'Shift') keyStates['Shift'] = false;
    if (event.key === 'Alt') keyStates['Alt'] = false;
    
    // For regular keys
    keyStates[event.key] = false;
    
    // Special case for Space key
    if (event.key === ' ') {
      keyStates['Space'] = false;
    }
  };
  
  // Add event listeners
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  // Return a cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
};

// Function to simulate clipboard operations in web environment
export const webClipboard = {
  readText: async () => {
    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      return '';
    }
  },
  writeText: async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to write to clipboard:', error);
      return false;
    }
  }
};