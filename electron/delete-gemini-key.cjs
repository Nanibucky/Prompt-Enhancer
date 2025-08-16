// delete-gemini-key.cjs
// A utility script to delete the Gemini API key for testing purposes

const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const Store = require('electron-store');

// Initialize app if not already initialized
if (!app.isReady()) {
  app.whenReady().then(() => {
    deleteGeminiKey();
  });
} else {
  deleteGeminiKey();
}

function deleteGeminiKey() {
  try {
    // Initialize the store
    const store = new Store();
    
    // Get the user data path
    const userDataPath = app.getPath('userData');
    
    // Path to the config file
    const configPath = path.join(userDataPath, 'config.json');
    
    console.log('Config file path:', configPath);
    console.log('Current store contents:', store.store);
    
    // Check if the Gemini API key exists
    if (store.has('gemini-api-key')) {
      console.log('Gemini API key exists, deleting...');
      store.delete('gemini-api-key');
      console.log('Gemini API key deleted successfully');
      console.log('Updated store contents:', store.store);
    } else {
      console.log('Gemini API key does not exist');
    }
    
    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error('Error deleting Gemini API key:', error);
    process.exit(1);
  }
}
