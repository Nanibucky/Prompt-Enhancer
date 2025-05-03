// electron/prompt-enhancer-wrapper.cjs
// This is a CommonJS wrapper for the ES module prompt-enhancer.js

// Create a dummy implementation that will be used if the real module can't be loaded
const dummySetupPromptEnhancer = (mainWindow) => {
  console.log('Using dummy prompt enhancer implementation');
};

// Export the dummy implementation by default
exports.setupPromptEnhancer = dummySetupPromptEnhancer;

// Try to dynamically import the ES module
(async () => {
  try {
    // Import the ES module
    const { setupPromptEnhancer } = await import('./dist/prompt-enhancer.js');
    
    // Replace the dummy implementation with the real one
    exports.setupPromptEnhancer = setupPromptEnhancer;
    
    console.log('Successfully loaded prompt-enhancer ES module');
  } catch (error) {
    console.error('Failed to load prompt-enhancer ES module:', error);
  }
})();
