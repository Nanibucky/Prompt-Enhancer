// electron/popup-manager.cjs
const { BrowserWindow } = require('electron');

/**
 * PopupManager class to manage application popups
 * Ensures only one popup of each type is shown at a time
 * and provides methods to manage popup lifecycle
 */
class PopupManager {
  constructor() {
    // Track active popups by type
    this.popups = new Map();
    this.activePopup = null;
  }

  /**
   * Set the active popup
   * @param {string} popupType - Type of popup (e.g., 'login', 'emptyText')
   * @param {BrowserWindow} window - The BrowserWindow instance
   */
  setActivePopup(popupType, window) {
    // Close any existing popup of the same type
    this.closePopup(popupType);
    
    // Store the new popup
    this.popups.set(popupType, window);
    this.activePopup = popupType;
    
    // Add closed event to clean up when window is closed
    window.once('closed', () => {
      if (this.popups.get(popupType) === window) {
        this.popups.delete(popupType);
        if (this.activePopup === popupType) {
          this.activePopup = null;
        }
      }
    });
    
    return window;
  }

  /**
   * Get an active popup by type
   * @param {string} popupType - Type of popup
   * @returns {BrowserWindow|null} The popup window or null if not found
   */
  getPopup(popupType) {
    const popup = this.popups.get(popupType);
    if (popup && !popup.isDestroyed()) {
      return popup;
    }
    
    // Clean up destroyed windows
    if (popup) {
      this.popups.delete(popupType);
      if (this.activePopup === popupType) {
        this.activePopup = null;
      }
    }
    
    return null;
  }

  /**
   * Close a specific popup
   * @param {string} popupType - Type of popup to close
   * @returns {boolean} True if a popup was closed, false otherwise
   */
  closePopup(popupType) {
    const popup = this.getPopup(popupType);
    if (popup) {
      popup.close();
      this.popups.delete(popupType);
      if (this.activePopup === popupType) {
        this.activePopup = null;
      }
      return true;
    }
    return false;
  }

  /**
   * Close all active popups
   */
  closeAllPopups() {
    for (const [popupType, popup] of this.popups.entries()) {
      if (popup && !popup.isDestroyed()) {
        popup.close();
      }
      this.popups.delete(popupType);
    }
    this.activePopup = null;
  }

  /**
   * Check if any popup is currently showing
   * @returns {boolean} True if any popup is showing
   */
  isAnyPopupShowing() {
    for (const [popupType, popup] of this.popups.entries()) {
      if (popup && !popup.isDestroyed() && popup.isVisible()) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a specific popup is showing
   * @param {string} popupType - Type of popup to check
   * @returns {boolean} True if the specified popup is showing
   */
  isPopupShowing(popupType) {
    const popup = this.getPopup(popupType);
    return popup !== null && popup.isVisible();
  }

  /**
   * Focus a specific popup if it exists
   * @param {string} popupType - Type of popup to focus
   * @returns {boolean} True if the popup was focused, false otherwise
   */
  focusPopup(popupType) {
    const popup = this.getPopup(popupType);
    if (popup) {
      popup.setAlwaysOnTop(true, 'screen-saver');
      popup.show();
      popup.focus();
      popup.moveTop();
      
      // Double-check that it stays on top
      setTimeout(() => {
        if (!popup.isDestroyed()) {
          popup.show();
          popup.focus();
          popup.moveTop();
        }
      }, 300);
      
      return true;
    }
    return false;
  }
}

module.exports = PopupManager;
