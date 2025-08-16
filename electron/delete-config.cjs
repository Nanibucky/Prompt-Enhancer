// delete-config.cjs
// A utility script to delete the configuration file for testing purposes

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

// Initialize app if not already initialized
if (!app.isReady()) {
  app.whenReady().then(() => {
    deleteConfig();
  });
} else {
  deleteConfig();
}

function deleteConfig() {
  try {
    // Get the user data path
    const userDataPath = app.getPath('userData');
    
    // Path to the config file
    const configPath = path.join(userDataPath, 'config.json');
    
    console.log('Config file path:', configPath);
    
    // Check if the file exists
    if (fs.existsSync(configPath)) {
      console.log('Config file exists, deleting...');
      fs.unlinkSync(configPath);
      console.log('Config file deleted successfully');
    } else {
      console.log('Config file does not exist');
    }
    
    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error('Error deleting config file:', error);
    process.exit(1);
  }
}
