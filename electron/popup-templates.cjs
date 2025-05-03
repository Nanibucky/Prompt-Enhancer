// electron/popup-templates.cjs
const createLoadingPopupContent = (mode) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Enhancing Prompt</title>
      <style>
        /* Optimized CSS for fast loading */
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; height: 100vh; }
        .container { background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 450px; animation: fadeIn 0.3s ease-out; }
        .tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; margin-bottom: 20px; background-color: #f1f5f9; border-radius: 8px; padding: 4px; }
        .tab { padding: 8px 12px; text-align: center; cursor: pointer; border-radius: 6px; font-weight: 500; font-size: 14px; transition: all 0.2s ease; }
        .tab.active { background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .spinner { border: 4px solid rgba(0, 0, 0, 0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #4f46e5; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="tabs">
          <div class="tab ${mode === 'agent' ? 'active' : ''}">Agent</div>
          <div class="tab ${mode === 'general' ? 'active' : ''}">General</div>
          <div class="tab ${mode === 'answer' ? 'active' : ''}">Answer</div>
        </div>
        <div style="text-align: center;">
          <div class="spinner"></div>
          <p>${mode === 'answer' ? 'Generating direct answer...' : mode === 'agent' ? 'Enhancing for AI agents...' : 'Enhancing your prompt...'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const createResultPopupContent = (enhancedText, mode) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Enhanced Prompt</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); display: flex; align-items: center; justify-content: center; height: 100vh; }
        .container { background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 90%; max-width: 600px; animation: fadeIn 0.3s ease-out; }
        .tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; margin-bottom: 20px; background-color: #f1f5f9; border-radius: 8px; padding: 4px; }
        .tab { padding: 8px 12px; text-align: center; cursor: pointer; border-radius: 6px; font-weight: 500; font-size: 14px; transition: all 0.2s ease; }
        .tab.active { background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .tab:hover:not(.active) { background-color: rgba(255, 255, 255, 0.5); }
        .prompt-container { margin-bottom: 20px; }
        .prompt-heading { font-size: 16px; margin-bottom: 15px; font-weight: 500; text-align: center; }
        .text-container { overflow-y: auto; margin-bottom: 15px; text-align: left; padding: 15px; border-radius: 8px; background-color: #f8fafc; white-space: pre-wrap; word-break: break-word; font-size: 14px; line-height: 1.6; max-height: 60vh; border: 1px solid #e2e8f0; }
        .buttons { display: flex; justify-content: center; gap: 12px; margin-top: 10px; }
        button { background: linear-gradient(to right, #4f46e5, #7c3aed); color: white; padding: 12px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 600; transition: all 0.3s ease; flex: 1; }
        button:hover { background: linear-gradient(to right, #4338ca, #6d28d9); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
        button.secondary { background: linear-gradient(to right, #9ca3af, #6b7280); }
        button.secondary:hover { background: linear-gradient(to right, #6b7280, #4b5563); }
        .copy-success { color: #10b981; font-weight: 500; font-size: 14px; margin-top: 12px; opacity: 0; transition: all 0.3s ease; text-align: center; padding: 8px; border-radius: 6px; }
        .copy-success.visible { opacity: 1; background-color: rgba(16, 185, 129, 0.1); }
        .copy-success.error { color: #ef4444; background-color: rgba(239, 68, 68, 0.1); }
        .copy-success.warning { color: #f59e0b; background-color: rgba(245, 158, 11, 0.1); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="tabs">
          <div class="tab ${mode === 'agent' ? 'active' : ''}" onclick="switchTab('agent')">Agent</div>
          <div class="tab ${mode === 'general' ? 'active' : ''}" onclick="switchTab('general')">General</div>
          <div class="tab ${mode === 'answer' ? 'active' : ''}" onclick="switchTab('answer')">Answer</div>
        </div>

        <div class="prompt-container">
          <div class="prompt-heading">
            ${mode === 'agent' ? 'Agent Task Prompt' : mode === 'answer' ? 'Direct Answer' : 'Enhanced Prompt'}
          </div>
          <div class="text-container" id="enhancedText">${enhancedText}</div>
        </div>

        <div class="buttons">
          <button class="secondary" onclick="regeneratePrompt()">Regenerate</button>
          <button onclick="copyToClipboard()">Copy</button>
          <button class="secondary" onclick="useText()">Use</button>
        </div>
        <div class="copy-success" id="copySuccess">Copied to clipboard!</div>
      </div>

      <script>
        let currentTab = '${mode}';

        function switchTab(tabName) {
          // Store the previous tab for comparison
          const previousTab = currentTab;

          // Update the current tab
          currentTab = tabName;
          console.log('Switching tab from', previousTab, 'to', currentTab);

          // Update the UI
          const tabs = document.querySelectorAll('.tab');
          tabs.forEach(tab => tab.classList.remove('active'));
          event.target.classList.add('active');

          // Update the prompt heading based on the selected tab
          const promptHeading = document.querySelector('.prompt-heading');
          if (promptHeading) {
            promptHeading.textContent = tabName === 'agent' ? 'Agent Task Prompt' :
                                      tabName === 'answer' ? 'Direct Answer' :
                                      'Enhanced Prompt';
          }

          // Only regenerate if the tab has actually changed
          if (previousTab !== currentTab) {
            // Create a unique URL with timestamp to avoid caching issues
            const timestamp = Date.now();
            const regenerateUrl = 'prompt-enhancer://regenerate?mode=' + currentTab + '&t=' + timestamp + '&checkClipboard=true';
            console.log('Regenerating with mode:', currentTab);

            // Show appropriate loading message based on the mode
            const loadingMessage = currentTab === 'agent' ? 'Enhancing for AI agents...' :
                                 currentTab === 'answer' ? 'Generating direct answer...' :
                                 'Enhancing your prompt...';

            // Show loading state immediately
            document.getElementById('enhancedText').innerHTML = '<div style="text-align: center;"><div class="spinner"></div><p>' + loadingMessage + '</p></div>';

            // Use a simple and reliable method to trigger the protocol handler
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            iframe.src = regenerateUrl;

            // Clean up the iframe after it's loaded
            iframe.onload = function() {
              setTimeout(() => {
                if (iframe.parentNode) {
                  document.body.removeChild(iframe);
                }
              }, 100);
            };
          }
        }

        function regeneratePrompt() {
          // Store the original content in case we need to restore it
          const originalContent = document.getElementById('enhancedText').innerHTML;

          // Update the prompt heading based on the current tab
          const promptHeading = document.querySelector('.prompt-heading');
          if (promptHeading) {
            promptHeading.textContent = currentTab === 'agent' ? 'Agent Task Prompt' :
                                      currentTab === 'answer' ? 'Direct Answer' :
                                      'Enhanced Prompt';
          }

          // Show loading state immediately with appropriate message
          const loadingMessage = currentTab === 'agent' ? 'Regenerating agent prompt...' :
                               currentTab === 'answer' ? 'Generating new answer...' :
                               'Regenerating enhanced prompt...';

          document.getElementById('enhancedText').innerHTML = '<div style="text-align: center;"><div class="spinner"></div><p>' + loadingMessage + '</p></div>';

          try {
            // Log the current mode for debugging
            console.log('Regenerating with mode:', currentTab);

            // Use the api.regeneratePrompt method if available
            if (window.api && typeof window.api.regeneratePrompt === 'function') {
              console.log('Using api.regeneratePrompt to regenerate prompt with mode:', currentTab);

              // Set up a listener for regeneration errors
              if (window.api.onRegenerationError) {
                const cleanup = window.api.onRegenerationError((error) => {
                  console.error('Received regeneration error:', error);

                  // Restore the original content
                  document.getElementById('enhancedText').innerHTML = originalContent;

                  // Show an error message
                  const errorDiv = document.createElement('div');
                  errorDiv.style.color = '#b91c1c';
                  errorDiv.style.padding = '10px';
                  errorDiv.style.backgroundColor = '#fee2e2';
                  errorDiv.style.borderRadius = '6px';
                  errorDiv.style.marginTop = '10px';
                  errorDiv.textContent = 'Error: ' + (error || 'Failed to regenerate prompt');
                  document.getElementById('enhancedText').appendChild(errorDiv);

                  // Clean up the listener
                  if (cleanup) cleanup();
                });
              }

              // Call the regeneratePrompt method with the current tab mode
              window.api.regeneratePrompt(currentTab);
            } else {
              // Fallback to protocol handler if API is not available
              console.log('API not available, falling back to protocol handler');

              // Create a unique URL with timestamp to avoid caching issues
              const timestamp = Date.now();
              const regenerateUrl = 'prompt-enhancer://regenerate?mode=' + currentTab + '&t=' + timestamp + '&checkClipboard=true';
              console.log('Regenerating with URL:', regenerateUrl);

              // Use a simple and reliable method to trigger the protocol handler
              const iframe = document.createElement('iframe');
              iframe.style.display = 'none';

              // Set up error handling
              let handlerTriggered = false;

              // Set up a timeout to detect if the handler wasn't triggered
              const timeoutId = setTimeout(() => {
                if (!handlerTriggered) {
                  console.error('Regeneration handler not triggered within timeout');
                  // Restore the original content
                  document.getElementById('enhancedText').innerHTML = originalContent;
                  // Show an error message
                  const errorDiv = document.createElement('div');
                  errorDiv.style.color = '#b91c1c';
                  errorDiv.style.padding = '10px';
                  errorDiv.style.backgroundColor = '#fee2e2';
                  errorDiv.style.borderRadius = '6px';
                  errorDiv.style.marginTop = '10px';
                  errorDiv.textContent = 'Failed to regenerate prompt. Please try again.';
                  document.getElementById('enhancedText').appendChild(errorDiv);

                  // Try to open the login page directly as a fallback
                  try {
                    const loginIframe = document.createElement('iframe');
                    loginIframe.style.display = 'none';
                    document.body.appendChild(loginIframe);
                    loginIframe.src = 'prompt-enhancer://open-login';

                    // Remove the iframe after it's loaded
                    loginIframe.onload = function() {
                      setTimeout(() => {
                        if (loginIframe.parentNode) {
                          document.body.removeChild(loginIframe);
                        }
                      }, 100);
                    };
                  } catch (loginError) {
                    console.error('Error opening login page:', loginError);
                  }
                }
              }, 5000); // 5 second timeout

              // Set up the onload handler
              iframe.onload = function() {
                handlerTriggered = true;
                clearTimeout(timeoutId);
                setTimeout(() => {
                  if (iframe.parentNode) {
                    document.body.removeChild(iframe);
                  }
                }, 100);
              };

              // Add the iframe to the document and set its source
              document.body.appendChild(iframe);
              iframe.src = regenerateUrl;
            }

            // Set up a listener for window close events
            // This helps detect if the window is closed due to a login alert
            window.addEventListener('beforeunload', function(e) {
              console.log('Window is being closed, possibly due to login alert');
            });
          } catch (error) {
            console.error('Error triggering regeneration:', error);

            // Restore the original content
            document.getElementById('enhancedText').innerHTML = originalContent;

            // Show an error message
            const errorDiv = document.createElement('div');
            errorDiv.style.color = '#b91c1c';
            errorDiv.style.padding = '10px';
            errorDiv.style.backgroundColor = '#fee2e2';
            errorDiv.style.borderRadius = '6px';
            errorDiv.style.marginTop = '10px';
            errorDiv.textContent = 'Error: ' + (error.message || 'Failed to regenerate prompt');
            document.getElementById('enhancedText').appendChild(errorDiv);

            // Try to open the login page directly as a fallback
            try {
              const loginIframe = document.createElement('iframe');
              loginIframe.style.display = 'none';
              document.body.appendChild(loginIframe);
              loginIframe.src = 'prompt-enhancer://open-login';

              // Remove the iframe after it's loaded
              loginIframe.onload = function() {
                setTimeout(() => {
                  if (loginIframe.parentNode) {
                    document.body.removeChild(loginIframe);
                  }
                }, 100);
              };
            } catch (loginError) {
              console.error('Error opening login page:', loginError);
            }
          }
        }

        function copyToClipboard() {
          const text = document.getElementById('enhancedText').innerText;
          const copySuccess = document.getElementById('copySuccess');

          // Reset any existing classes
          copySuccess.classList.remove('error', 'warning');

          navigator.clipboard.writeText(text)
            .then(() => {
              copySuccess.innerText = 'Copied to clipboard!';
              copySuccess.classList.add('visible');
              setTimeout(() => {
                copySuccess.classList.remove('visible');
              }, 2000);
            })
            .catch(err => {
              console.error('Failed to copy text: ', err);
              copySuccess.innerText = 'Failed to copy text!';
              copySuccess.classList.add('visible', 'error');
              setTimeout(() => {
                copySuccess.classList.remove('visible', 'error');
              }, 2000);
            });
        }

        function useText() {
          const text = document.getElementById('enhancedText').innerText;

          // Create a hidden iframe to communicate with the main process
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.onload = function() {
            // Remove the iframe after it's loaded to clean up
            setTimeout(() => {
              document.body.removeChild(iframe);
            }, 100);
          };

          // Add the iframe to the document and set its source to our custom protocol
          document.body.appendChild(iframe);

          // Use the custom protocol to confirm the text and trigger auto-paste
          // Add a timestamp to avoid caching
          const timestamp = Date.now();
          iframe.src = 'prompt-enhancer://confirm?text=' + encodeURIComponent(text) + '&t=' + timestamp;
        }
      </script>
    </body>
    </html>
  `;
};

const createErrorPopupContent = (error, mode) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Enhancement Error</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #ef4444, #b91c1c); display: flex; align-items: center; justify-content: center; height: 100vh; }
        .container { background: rgba(255, 255, 255, 0.95); border-radius: 16px; padding: 25px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 90%; max-width: 600px; animation: fadeIn 0.3s ease-out; }
        .tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; margin-bottom: 20px; background-color: #f1f5f9; border-radius: 8px; padding: 4px; }
        .tab { padding: 8px 12px; text-align: center; cursor: pointer; border-radius: 6px; font-weight: 500; font-size: 14px; transition: all 0.2s ease; }
        .tab.active { background-color: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .error-container { text-align: center; }
        .icon { font-size: 48px; margin-bottom: 15px; }
        h2 { color: #b91c1c; margin-top: 0; font-size: 24px; font-weight: 700; margin-bottom: 15px; }
        p { margin: 15px 0; color: #4b5563; line-height: 1.6; font-size: 15px; font-weight: 400; }
        .error-message { background-color: #fee2e2; padding: 12px; border-radius: 8px; text-align: left; font-size: 14px; margin-top: 15px; color: #b91c1c; white-space: pre-wrap; word-break: break-word; }
        .buttons { display: flex; justify-content: center; gap: 16px; margin-top: 20px; }
        button { background: linear-gradient(to right, #ef4444, #b91c1c); color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 600; transition: all 0.3s ease; }
        button:hover { background: linear-gradient(to right, #dc2626, #991b1b); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="tabs">
          <div class="tab ${mode === 'agent' ? 'active' : ''}">Agent</div>
          <div class="tab ${mode === 'general' ? 'active' : ''}">General</div>
          <div class="tab ${mode === 'answer' ? 'active' : ''}">Answer</div>
        </div>

        <div class="error-container">
          <div class="icon">⚠️</div>
          <h2>Enhancement Failed</h2>
          <p>We encountered an error while enhancing your prompt:</p>
          <div class="error-message">${error.message}</div>
        </div>

        <div class="buttons">
          <button onclick="window.close()">Close</button>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  createLoadingPopupContent,
  createResultPopupContent,
  createErrorPopupContent
};
