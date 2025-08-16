// electron/direct-enhancer.cjs
const { app, clipboard, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');
const { showEmptyTextAlert, getLoginAlertShowing } = require('./alert-utils.cjs');
const { autoPaste } = require('./auto-paste.cjs');
const {
  createLoadingPopupContent,
  createResultPopupContent,
  createErrorPopupContent
} = require('./popup-templates.cjs');
const optimizedConfig = require('./config/optimized-config.cjs');
const { optimizeWindowCreation, setupWindowOptimizations } = optimizedConfig;

// Import CommonJS modules
const PromptSystemManager = require('./prompt-system.cjs');
const PerformanceOptimizer = require('./performance-optimizer.cjs');
const MessagePatternDetector = require('./message-patterns.cjs');

// Track the enhancement popup window and state
let enhancementPopupWindow = null;
let directEnhancementPopupShowing = false;
let lastUsedText = '';

// Track active enhancement requests
const activeRequests = new Map();

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Clipboard monitoring variables
let clipboardCache = '';
let clipboardCheckInterval = null;

// Export the popup state flag
const getDirectEnhancementPopupShowing = () => directEnhancementPopupShowing;

// Function to reset the popup state flag
const resetDirectEnhancementPopupShowing = () => {
  console.log('Resetting directEnhancementPopupShowing flag');
  directEnhancementPopupShowing = false;
  return true;
};

// Retry logic with exponential backoff
async function withRetry(operation, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);

      // Rate limit specific handling
      if (error.status === 429 && attempt < maxRetries) {
        const backoffDelay = delay * Math.pow(2, attempt - 1);
        console.log(`Rate limited. Waiting ${backoffDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
      }

      // Abort on non-retryable errors
      if (error.status === 401 || error.status === 403) {
        break;
      }

      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}

function formatEnhancementError(error) {
  console.log('Formatting enhancement error:', error);

  // Create a detailed error message with debugging information
  let errorMessage = 'Failed to enhance prompt. ';
  let debugInfo = {};

  // Extract all available error information
  if (error.status) debugInfo.status = error.status;
  if (error.code) debugInfo.code = error.code;
  if (error.type) debugInfo.type = error.type;
  if (error.param) debugInfo.param = error.param;

  // Log the full error details for debugging
  console.error('Enhancement error details:', debugInfo);

  // Check if this is a Gemini API error
  const isGeminiError = error.message && (
    error.message.includes('GoogleGenerativeAI') ||
    error.message.includes('generativelanguage.googleapis.com')
  );

  // Format user-friendly error message based on error type
  if (isGeminiError) {
    // Handle Gemini-specific errors
    if (error.message.includes('429 Too Many Requests') || error.message.includes('exceeded your current quota')) {
      errorMessage += 'Gemini API rate limit exceeded. Please try again later or switch to OpenAI in settings. You can also upgrade your Google AI Studio plan for higher limits.';
    } else if (error.message.includes('401 Unauthorized') || error.message.includes('403 Forbidden')) {
      errorMessage += 'Invalid Gemini API key. Please check your Gemini API key in settings.';
    } else if (error.message.includes('500 ') || error.message.includes('503 ')) {
      errorMessage += 'Gemini API server error. Please try again later or switch to OpenAI in settings.';
    } else if (error.message.includes('not found for API version')) {
      errorMessage += 'Invalid Gemini model specified. Please select a different model in settings.';
    } else {
      // Generic Gemini error
      errorMessage += 'Gemini API error: ' + error.message.replace(/\[GoogleGenerativeAI Error\]:\s*/g, '');
    }
  } else {
    // Handle OpenAI and other errors
    if (error.status === 401) {
      errorMessage += 'Invalid API key. Please check your OpenAI API key and try again.';
    } else if (error.status === 429) {
      errorMessage += 'Rate limit exceeded. Please try again later or check your OpenAI account limits.';
    } else if (error.status === 500) {
      errorMessage += 'OpenAI server error. Please try again later.';
    } else if (error.status === 503) {
      errorMessage += 'OpenAI service is temporarily unavailable. Please try again in a few minutes.';
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      errorMessage += 'Network connection error. Please check your internet connection.';
    } else if (error.type === 'invalid_request_error') {
      errorMessage += `Invalid request: ${error.message || 'Please check your inputs and try again.'}`;
    } else if (error.message && error.message.includes('API key')) {
      errorMessage += 'API key issue. Please check your API key in settings.';
    } else if (error.message) {
      // Clean up common error messages for better user experience
      let cleanMessage = error.message
        .replace(/Error: OpenAI: /g, '')
        .replace(/\((?:status code|Status code|Request ID): [^)]+\)/g, '');
      errorMessage += cleanMessage;
    } else {
      errorMessage += 'Unexpected error occurred. Please try again.';
    }
  }

  // Add debugging information to the console but not to the user-facing error
  console.error('Formatted error message:', errorMessage);

  return new Error(errorMessage);
}

function postProcessEnhancement(text, platform, originalText, format = 'text') {
  // Check if original text had emojis
  // This comprehensive regex covers most emoji categories including emoticons, symbols, flags, etc.
  const emojiRegex = /[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2B50}\u{2B55}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]{2}|[\u{1F900}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]/gu;
  const originalHasEmojis = emojiRegex.test(originalText);

  // If original text didn't have emojis, remove any emojis from the enhanced text
  if (!originalHasEmojis) {
    text = text.replace(emojiRegex, '');
  }

  // Format-specific processing
  if (format === 'email') {
    // Preserve email format
    // Check if the enhanced text has email headers
    const hasHeaders = /^(From|To|Subject|Date|Cc|Bcc):\s/m.test(text);

    // If the original had headers but the enhanced doesn't, try to preserve them
    if (!hasHeaders && /^(From|To|Subject|Date|Cc|Bcc):\s/m.test(originalText)) {
      // Extract headers from original text
      const headerMatches = originalText.match(/^(From|To|Subject|Date|Cc|Bcc):[^\n]*/gm);
      if (headerMatches && headerMatches.length > 0) {
        // Add headers to the beginning of the enhanced text
        text = headerMatches.join('\n') + '\n\n' + text;
      }
    }

    // Preserve email signature if present in original
    const signatureMatch = originalText.match(/\n--\s*\n[\s\S]*$/m) ||
                          originalText.match(/\n(Regards|Sincerely|Best|Thank you),\s*\n[\s\S]*$/m);
    if (signatureMatch && !text.includes('--') &&
        !/(Regards|Sincerely|Best|Thank you),/m.test(text)) {
      text = text + signatureMatch[0];
    }
  } else if (format === 'code') {
    // Preserve code blocks
    const originalCodeBlocks = originalText.match(/```[\w]*\n[\s\S]*?\n```|`[^`]+`/g);
    if (originalCodeBlocks && !text.includes('```')) {
      // If enhanced text lost code blocks, try to add them back
      text = text + '\n\n' + originalCodeBlocks.join('\n\n');
    }
  } else if (format === 'list') {
    // Ensure list formatting is preserved
    if (!/^\s*[-*•]\s+|^\s*\d+\.\s+/m.test(text) && /^\s*[-*•]\s+|^\s*\d+\.\s+/m.test(originalText)) {
      // Convert paragraphs to bullet points if original was a list
      text = text.split('\n\n').map(para => `• ${para}`).join('\n');
    }
  } else if (format === 'chat') {
    // Preserve chat format with speaker names
    const originalChatFormat = originalText.match(/^\s*[\w\s]+:\s*.+$/gm);
    const enhancedChatFormat = text.match(/^\s*[\w\s]+:\s*.+$/gm);

    if (originalChatFormat && (!enhancedChatFormat || enhancedChatFormat.length < originalChatFormat.length)) {
      // Try to restore chat format by extracting speaker names from original
      const speakerNames = originalText.match(/^\s*([\w\s]+):/gm);
      if (speakerNames && speakerNames.length > 0) {
        // If we have speaker names but enhanced text lost them, try to reformat
        const paragraphs = text.split('\n\n');
        if (paragraphs.length === speakerNames.length) {
          // Map each paragraph to a speaker
          text = paragraphs.map((para, i) => {
            const speaker = speakerNames[i].trim();
            return `${speaker} ${para}`;
          }).join('\n\n');
        }
      }
    }
  } else if (format === 'thread') {
    // Preserve quoted message format
    const hasQuotes = /^\s*>\s*.+$/m.test(text);
    if (!hasQuotes && /^\s*>\s*.+$/m.test(originalText)) {
      // Extract quoted parts from original
      const quotedParts = originalText.match(/^\s*>\s*.+$(\n\s*>\s*.+$)*/gm);
      if (quotedParts && quotedParts.length > 0) {
        // Add quoted parts back to the beginning
        text = quotedParts.join('\n') + '\n\n' + text;
      }
    }
  } else if (format === 'message') {
    // For general messages, just ensure we're not adding unnecessary formality
    // Remove email-like signatures if they weren't in the original
    if (!/(Regards|Sincerely|Best|Thank you),/m.test(originalText) &&
        /(Regards|Sincerely|Best|Thank you),/m.test(text)) {
      text = text.replace(/\n(Regards|Sincerely|Best|Thank you),\s*\n[\s\S]*$/m, '');
    }

    // Remove formal greetings if they weren't in the original
    if (!/(Dear|Hello|Hi)\s+[\w\s]+,/m.test(originalText) &&
        /(Dear|Hello|Hi)\s+[\w\s]+,/m.test(text)) {
      text = text.replace(/^(Dear|Hello|Hi)\s+[\w\s]+,\s*\n+/m, '');
    }
  }

  // Add platform-specific formatting
  switch (platform) {
    case 'whatsapp':
      // Ensure proper line breaks for mobile viewing
      if (format !== 'code' && format !== 'list') {
        text = text.replace(/([.!?])\s+/g, '$1\n');
      }
      break;
    case 'slack':
      // Convert to slack-style formatting
      text = text.replace(/\*\*(.*?)\*\*/g, '*$1*'); // Bold
      text = text.replace(/__(.*?)__/g, '_$1_'); // Italic
      break;
    case 'twitter':
      // Truncate to 280 characters if needed
      if (text.length > 280) {
        text = text.substring(0, 277) + '...';
      }
      break;
  }

  // Clean up any extra whitespace that might have been created
  // But only if not a format that requires whitespace preservation
  if (format !== 'code' && format !== 'json' && format !== 'list' && format !== 'table') {
    // For other formats, preserve paragraph breaks but clean up excessive whitespace
    text = text.replace(/\n{3,}/g, '\n\n'); // Replace 3+ newlines with 2

    // Don't collapse all whitespace to single spaces for formats that need structure
    if (format !== 'email' && format !== 'chat' && format !== 'thread') {
      // For simple messages, we can be more aggressive with whitespace cleanup
      text = text.replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs with single space
    }

    text = text.trim();
  }

  return text;
}

// Enhanced text enhancement function with context awareness
async function enhanceTextWithContext(text, apiKey, model = 'gpt-4', mode = 'general', noCache = false) {
  try {
    console.log(`enhanceTextWithContext called with mode: ${mode}, noCache: ${noCache}`);

    // CRITICAL: Double-check authentication before proceeding with any enhancement
    // Get the selected provider
    const selectedProvider = global.store.get('selected-provider', 'openai');
    console.log('enhanceTextWithContext using provider:', selectedProvider);

    // Validate API key before proceeding
    let validApiKey;
    if (selectedProvider === 'gemini') {
      validApiKey = global.store.get('gemini-api-key', '');
      console.log('Double-checking Gemini API key:', validApiKey ? 'Key exists' : 'No key found');

      // Additional validation for Gemini API key
      if (!validApiKey || validApiKey === 'undefined' || validApiKey === 'null' || validApiKey.trim() === '') {
        console.error('Gemini API key not found or invalid in enhanceTextWithContext');

        // Show login alert
        const { showLoginAlert } = require('./alert-utils.cjs');
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

        if (mainWindow) {
          console.log('ENHANCE: Showing login alert for missing Gemini API key');

          // Make sure the main window is visible and in front
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
          mainWindow.focus();
          mainWindow.moveTop();

          console.log('ENHANCE: Main window is now visible and focused');

          // ALWAYS show login alert first before doing anything else
          // The navigation to setup page is now handled inside showLoginAlert with a delay
          showLoginAlert(mainWindow);

          console.log('ENHANCE: Login alert shown for Gemini');
        }

        throw new Error('Gemini API key not found. Please add your API key in settings.');
      }
    } else {
      validApiKey = global.store.get('openai-api-key', '');
      console.log('Double-checking OpenAI API key:', validApiKey ? 'Key exists' : 'No key found');

      if (!validApiKey || validApiKey.trim() === '') {
        console.error('OpenAI API key not found or invalid in enhanceTextWithContext');

        // Show login alert
        const { showLoginAlert } = require('./alert-utils.cjs');
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

        if (mainWindow) {
          console.log('ENHANCE: Showing login alert for missing OpenAI API key');

          // Make sure the main window is visible and in front
          if (!mainWindow.isVisible()) {
            mainWindow.show();
          }
          mainWindow.focus();
          mainWindow.moveTop();

          console.log('ENHANCE: Main window is now visible and focused');

          // ALWAYS show login alert first before doing anything else
          // The navigation to setup page is now handled inside showLoginAlert with a delay
          showLoginAlert(mainWindow);

          console.log('ENHANCE: Login alert shown for OpenAI');
        }

        throw new Error('OpenAI API key not found. Please add your API key in settings.');
      }
    }

    // If in answer mode, generate a direct answer to the question/prompt
    if (mode === 'answer') {
      console.log('Answer mode selected - generating direct answer');

      // Execute with retry logic
      const result = await withRetry(async () => {
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that provides direct, concise, and accurate answers. Respond directly to the user\'s question or request without unnecessary preamble. Be thorough but efficient with your response.'
            },
            {
              role: 'user',
              content: text
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        });

        return response.choices[0].message.content.trim();
      });

      return result;
    }

    // If in answer-with-instructions mode, generate a response based on the text and user instructions
    if (mode === 'answer-with-instructions') {
      console.log('Answer with instructions mode selected');

      // The instructions should be passed as the fifth parameter
      const instructions = arguments[4];

      if (!instructions) {
        console.error('No instructions provided for answer-with-instructions mode');
        throw new Error('Instructions are required for this mode');
      }

      console.log('Using instructions:', instructions);

      // Execute with retry logic
      const result = await withRetry(async () => {
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant that crafts responses based on specific user instructions.
              You will be given:
              1. A piece of text (like an email or message)
              2. Instructions on how to respond to it

              Your task is to generate a well-crafted response following those instructions precisely.
              Be concise, professional, and natural in your response.`
            },
            {
              role: 'user',
              content: `TEXT TO RESPOND TO:\n${text}\n\nINSTRUCTIONS:\n${instructions}\n\nPlease write a response based on these instructions.`
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        });

        return response.choices[0].message.content.trim();
      });

      return result;
    }

    const promptManager = PromptSystemManager.getInstance();
    const optimizer = PerformanceOptimizer.getInstance();
    const patternDetector = new MessagePatternDetector();

    // Define the enhancement function
    const enhancementFunction = async (text, mode) => {
      // Detect platform and adapt accordingly
      const platformInfo = patternDetector.detectPlatform(text);
      console.log('Platform detection:', platformInfo);

      // Analyze message context in detail
      const analysis = promptManager.analyzeMessage(text);
      console.log('Message analysis:', analysis);

      // Merge platform detection with analysis
      if (platformInfo.confidence > 3) {
        analysis.context.platform = platformInfo.platform;
        analysis.context.tone = platformInfo.tone;

        // Add format information if available
        if (platformInfo.format) {
          analysis.context.format = platformInfo.format;
          console.log('Detected format:', platformInfo.format);

          // Log a sample of the text to help with debugging format detection
          const textSample = text.length > 100 ? text.substring(0, 100) + '...' : text;
          console.log('Text sample for format detection:', textSample);

          // Log format-specific details
          if (platformInfo.format === 'email') {
            console.log('Email format details: Headers present:', /^(From|To|Subject|Date|Cc|Bcc):\s/m.test(text));
            console.log('Email format details: Signature present:', /\n(Regards|Sincerely|Best|Thank you),/m.test(text));
          } else if (platformInfo.format === 'code') {
            console.log('Code format details: Code blocks present:', /```[\w]*\n[\s\S]*?\n```|`[^`]+`/g.test(text));
          } else if (platformInfo.format === 'chat') {
            const chatLines = text.match(/^\s*[\w\s]+:\s*.+$/gm);
            console.log('Chat format details: Chat lines detected:', chatLines ? chatLines.length : 0);
          }
        }
      }

      // Generate context-aware system prompt
      const systemPrompt = promptManager.generatePrompt(analysis, mode);
      console.log('Generated system prompt for mode:', mode);

      // Add platform-specific guidelines with format information
      const guidelines = patternDetector.generatePlatformGuidelines(
        analysis.context.platform || 'general',
        analysis.context.tone || 'professional',
        analysis.context.format || 'text'
      );
      const fullPrompt = `${systemPrompt}\n\nPlatform-Specific Guidelines:\n${guidelines}\n\nIMPORTANT: Preserve the original format and structure of the text. The detected format is '${analysis.context.format || 'text'}'. Do not convert simple messages into formal emails. Do not add unnecessary greetings or signatures if they weren't in the original. Maintain the original style, tone, and structure while improving the content.`;

      // Execute enhancement with retry logic
      const enhancedResult = await withRetry(async () => {
        // Get the selected provider
        const selectedProvider = global.store.get('selected-provider', 'openai');
        console.log('Using provider:', selectedProvider);

        // Different user prompts based on mode
        let userPrompt;
        if (mode === 'agent') {
          userPrompt = `Reformat this for AI coding assistants, maintaining context and preserving the original format (${analysis.context.format || 'text'}): ${text}`;
          console.log('Using agent-specific user prompt with format:', analysis.context.format || 'text');
        } else { // general mode
          userPrompt = `Enhance this prompt while preserving its original intent, format (${analysis.context.format || 'text'}), and adapting to the detected context: ${text}`;
          console.log('Using general enhancement user prompt with format:', analysis.context.format || 'text');
        }

        // Use the appropriate API based on the provider
        if (selectedProvider === 'gemini') {
          // Use Gemini API
          console.log('Using Gemini API with model:', model);
          const { GoogleGenerativeAI } = require('@google/generative-ai');
          const geminiApiKey = global.store.get('gemini-api-key', '');

          // Additional validation for Gemini API key
          if (!geminiApiKey || geminiApiKey === 'undefined' || geminiApiKey === 'null' || geminiApiKey.trim() === '') {
            console.error('Gemini API key not found or invalid');

            // Show login alert instead of just throwing an error
            const { showLoginAlert } = require('./alert-utils.cjs');
            const { BrowserWindow } = require('electron');
            const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

            if (mainWindow) {
              console.log('ENHANCE_FUNC: Showing login alert for missing Gemini API key');

              // Make sure the main window is visible and in front
              if (!mainWindow.isVisible()) {
                mainWindow.show();
              }
              mainWindow.focus();
              mainWindow.moveTop();

              console.log('ENHANCE_FUNC: Main window is now visible and focused');

              // ALWAYS show login alert first before doing anything else
              // The navigation to setup page is now handled inside showLoginAlert with a delay
              showLoginAlert(mainWindow);

              console.log('ENHANCE_FUNC: Login alert shown for Gemini');
            }

            throw new Error('Gemini API key not found. Please add your API key in settings.');
          }

          const genAI = new GoogleGenerativeAI(geminiApiKey);

          // Fix model name handling for Gemini API
          let geminiModelName;
          if (model === 'gemini-pro') {
            geminiModelName = 'gemini-pro';
          } else if (model === 'gemini-1.5-pro') {
            geminiModelName = 'gemini-1.5-pro';
          } else if (model === 'gemini-1.5-flash') {
            geminiModelName = 'gemini-1.5-flash';
          } else if (model === 'gemini-1.5-pro-latest') {
            geminiModelName = 'gemini-1.5-pro-latest';
          } else if (model === 'gemini-ultra') {
            geminiModelName = 'gemini-ultra';
          } else {
            // Default to gemini-pro if model is not recognized
            console.log(`Unrecognized Gemini model: ${model}, defaulting to gemini-pro`);
            geminiModelName = 'gemini-pro';
          }

          console.log('Using Gemini model name:', geminiModelName);
          const geminiModel = genAI.getGenerativeModel({ model: geminiModelName });

          try {
            const geminiResponse = await geminiModel.generateContent([
              { text: fullPrompt },
              { text: userPrompt }
            ]);

            return geminiResponse.response.text();
          } catch (error) {
            console.error('Error calling Gemini API:', error);

            // Check if this is an authentication error
            if (error.message && (
              error.message.includes('401 Unauthorized') ||
              error.message.includes('403 Forbidden') ||
              error.message.includes('invalid API key')
            )) {
              throw new Error('Invalid Gemini API key. Please check your API key in settings.');
            }

            // Check if this is a rate limit error
            if (error.message && (
              error.message.includes('429 Too Many Requests') ||
              error.message.includes('exceeded your current quota')
            )) {
              throw new Error('Gemini API rate limit exceeded. Please try again later or switch to OpenAI in settings. You can also upgrade your Google AI Studio plan for higher limits.');
            }

            // Check if this is a model not found error
            if (error.message && error.message.includes('not found for API version')) {
              throw new Error('Invalid Gemini model specified. Please select a different model in settings.');
            }

            // Rethrow the original error for other cases
            throw error;
          }
        } else {
          // Use OpenAI API
          console.log('Using OpenAI API with model:', model);
          const openai = new OpenAI({ apiKey });

          const response = await openai.chat.completions.create({
            model,
            messages: [
              {
                role: 'system',
                content: fullPrompt,
              },
              {
                role: 'user',
                content: userPrompt,
              },
            ],
            max_tokens: 500,
            temperature: 0.7, // Balanced for consistency and creativity
          });

          return response.choices[0].message.content.trim();
        }
      });

      // Clean up format indicators and instruction text
      let enhancedText = enhancedResult;
      enhancedText = enhancedText.replace(/^\[Enhanced Prompt\]\s*/i, '');
      enhancedText = enhancedText.replace(/^\[Answer\]\s*/i, '');
      enhancedText = enhancedText.replace(/^\[Enhanced Agent Prompt\]\s*/i, '');
      enhancedText = enhancedText.replace(/^\[Greeting Protocol\]\s*/i, '');
      enhancedText = enhancedText.replace(/^improved prompt:\s*/i, '');
      enhancedText = enhancedText.replace(/^enhanced prompt:\s*/i, '');
      enhancedText = enhancedText.replace(/^\[ENHANCED\]\s*/i, '');
      enhancedText = enhancedText.replace(/^\[ANSWER\]\s*/i, '');
      enhancedText = enhancedText.replace(/^\[AGENT_TASK\]\s*/i, '');

      // Remove any comments or explanations that might be included
      enhancedText = enhancedText.replace(/^Note:.*$/im, '');
      enhancedText = enhancedText.replace(/^Comment:.*$/im, '');
      enhancedText = enhancedText.replace(/^Explanation:.*$/im, '');
      enhancedText = enhancedText.replace(/\n\s*Note:.*$/im, '');
      enhancedText = enhancedText.replace(/\n\s*Comment:.*$/im, '');
      enhancedText = enhancedText.replace(/\n\s*Explanation:.*$/im, '');

      // Remove any instruction text that might be included
      enhancedText = enhancedText.replace(/^Enhance this prompt while preserving its original intent.*?:\s*/i, '');
      enhancedText = enhancedText.replace(/^Reformat this for AI coding assistants.*?:\s*/i, '');
      enhancedText = enhancedText.replace(/^Enhance this prompt while preserving its original format.*?:\s*/i, '');
      enhancedText = enhancedText.replace(/^Enhance this prompt while preserving its original intent and format.*?:\s*/i, '');

      // Post-process based on platform, format, and original text
      return postProcessEnhancement(enhancedText, analysis.context.platform, text, analysis.context.format || 'text');
    };

    // If noCache is true, bypass the cache and call the enhancement function directly
    if (noCache) {
      console.log('Bypassing cache as requested');
      return await enhancementFunction(text, mode);
    } else {
      // Use performance optimization and caching
      return await optimizer.enhanceWithCache(text, mode, enhancementFunction);
    }
  } catch (error) {
    console.error('Enhancement error:', error);
    throw formatEnhancementError(error);
  }
}

// Legacy enhanceText function for backward compatibility
async function enhanceText(text, apiKey, model = 'gpt-4o-mini', mode = 'general', noCache = false) {
  return enhanceTextWithContext(text, apiKey, model, mode, noCache);
}

// Enhanced popup showing function with better error handling
async function showDirectEnhancementPopup(mainWindow, _store, isRegeneration = false, mode = 'general') {
  try {
    // Check if the user is logged in FIRST before doing anything else
    console.log('Checking if user is logged in before proceeding');

    // Get the selected provider
    const selectedProvider = global.store.get('selected-provider', 'openai');
    console.log('Using provider:', selectedProvider);

    // Get the appropriate API key based on the provider
    let apiKey;
    if (selectedProvider === 'gemini') {
      apiKey = global.store.get('gemini-api-key', '');
      console.log('Using Gemini API key:', apiKey ? 'Key exists' : 'No key found');
      console.log('Gemini API key length:', apiKey ? apiKey.length : 0);

      // Additional validation for Gemini API key
      if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.trim() === '') {
        console.log('Invalid or missing Gemini API key detected, treating as missing');
        apiKey = '';
      }
    } else {
      apiKey = global.store.get('openai-api-key', '');
      console.log('Using OpenAI API key:', apiKey ? 'Key exists' : 'No key found');
    }

    if (!apiKey || apiKey.trim() === '') {
      console.log('DIRECT: User is not logged in, showing login alert');

      // Make sure the main window is visible and in front
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
      mainWindow.moveTop();

      console.log('DIRECT: Main window is now visible and focused');

      // ALWAYS show login alert first before doing anything else
      // The navigation to setup page is now handled inside showLoginAlert with a delay
      const { showLoginAlert } = require('./alert-utils.cjs');
      showLoginAlert(mainWindow);

      console.log('DIRECT: Login alert shown');

      // Ensure popup manager is initialized
      try {
        if (typeof global.ensurePopupManagerInitialized === 'function') {
          global.ensurePopupManagerInitialized();
        } else if (!global.popupManager) {
          const PopupManager = require('./popup-manager.cjs');
          global.popupManager = new PopupManager();
          console.log('Popup manager initialized in direct-enhancer');
        }
      } catch (error) {
        console.error('Error ensuring popup manager is initialized:', error);
      }

      directEnhancementPopupShowing = false;
      return; // Exit early - don't proceed with enhancement
    }
    console.log('User is logged in, proceeding with enhancement');
    if (!mainWindow) {
      console.error('Main window is not available');
      return;
    }

    // Validate mode parameter
    if (!['agent', 'general', 'answer'].includes(mode)) {
      console.warn(`Invalid mode: ${mode}, defaulting to general`);
      mode = 'general';
    }

    console.log(`showDirectEnhancementPopup called with mode: ${mode}, isRegeneration: ${isRegeneration}`);

    // Set the flag to indicate a direct enhancement popup is showing
    directEnhancementPopupShowing = true;

    // If a popup window is already open, focus it instead of creating a new one
    if (enhancementPopupWindow && !enhancementPopupWindow.isDestroyed()) {
      enhancementPopupWindow.focus();
      console.log('Enhancement popup already showing, focusing existing window');
      return;
    }

    // Check for login alert first
    if (getLoginAlertShowing()) {
      console.log('Login alert already showing, skipping');
      directEnhancementPopupShowing = false;
      return;
    }

    // We already checked if the user is logged in at the beginning of the function
    // This check is redundant and causes a variable redeclaration error
    // The code below is commented out to prevent the error
    /*
    console.log('Checking if user is logged in before showing enhancement popup');
    const apiKey = store.get('openai-api-key', '');
    if (!apiKey || apiKey.trim() === '') {
    */

    // The login check is now done at the beginning of the function
    // No need for a redundant check here
    console.log('User is logged in, continuing with enhancement');

    // Get the text to enhance
    let textToEnhance = clipboard.readText('selection') || clipboard.readText();
    console.log(`Getting text from clipboard: ${textToEnhance ? textToEnhance.substring(0, 50) + '...' : 'No text found'}`);

    lastUsedText = textToEnhance;
    if (typeof global.lastUsedText !== 'undefined') {
      global.lastUsedText = textToEnhance;
    }

    // Check if there's any text in the clipboard
    if (!textToEnhance || textToEnhance.trim() === '') {
      console.log('No text selected or clipboard is empty');
      showEmptyTextAlert();
      directEnhancementPopupShowing = false;
      return;
    }

    // Get the selected model
    const selectedModel = global.store.get('selected-model', 'gpt-4o-mini');
    console.log('Using model:', selectedModel);

    // Create optimized popup window
    const windowConfig = optimizeWindowCreation({
      width: 650,
      height: 600,
      backgroundColor: '#ffffff',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    const { BrowserWindow } = require('electron');
    enhancementPopupWindow = new BrowserWindow(windowConfig);
    setupWindowOptimizations(enhancementPopupWindow);

    // If in answer mode, show the instruction popup instead of the loading screen
    if (mode === 'answer') {
      console.log('Answer mode selected - showing instruction popup');

      // Try multiple possible locations for the instruction popup HTML file
      const possiblePaths = [
        path.join(app.getAppPath(), 'instruction-popup.html'),
        path.join(app.getAppPath(), 'dist', 'instruction-popup.html'),
        path.join(__dirname, '..', 'instruction-popup.html'),
        path.join(__dirname, '..', 'dist', 'instruction-popup.html'),
        path.join(process.cwd(), 'instruction-popup.html'),
        path.join(process.cwd(), 'dist', 'instruction-popup.html'),
        path.join(process.cwd(), 'electron', 'instruction-popup.html')
      ];

      console.log('Searching for instruction-popup.html in the following paths:');
      const instructionPopupPath = possiblePaths.find(p => {
        const exists = fs.existsSync(p);
        console.log(` - ${p} (${exists ? 'EXISTS' : 'NOT FOUND'})`);
        return exists;
      });

      if (instructionPopupPath) {
        console.log('Found instruction popup at:', instructionPopupPath);

        // Store the text for later use
        lastUsedText = textToEnhance;
        global.lastUsedText = textToEnhance;

        // Load the instruction popup HTML file
        enhancementPopupWindow.loadFile(instructionPopupPath);

        // Send the original text to the instruction popup
        enhancementPopupWindow.webContents.once('did-finish-load', () => {
          console.log('Instruction popup loaded, sending original text');
          enhancementPopupWindow.webContents.send('original-text', textToEnhance);
          console.log('Sent original text to instruction popup:', textToEnhance.substring(0, 50) + (textToEnhance.length > 50 ? '...' : ''));
        });

        // Show the window when ready
        enhancementPopupWindow.once('ready-to-show', () => {
          console.log('Instruction popup ready to show');
          enhancementPopupWindow.show();
          enhancementPopupWindow.focus();
          enhancementPopupWindow.setAlwaysOnTop(true, 'screen-saver');
          console.log('Instruction popup window is now visible');

          // Ensure visibility - optimized delay
          setTimeout(() => {
            if (!enhancementPopupWindow.isDestroyed()) {
              enhancementPopupWindow.show();
              enhancementPopupWindow.focus();
              enhancementPopupWindow.moveTop();
            }
          }, 100);
        });

        // Set up IPC handlers for the instruction popup
        setupInstructionPopupHandlers(enhancementPopupWindow, apiKey, selectedModel, textToEnhance);
        console.log('Set up instruction popup handlers');

        return; // Exit early - don't proceed with enhancement
      } else {
        console.error('Instruction popup HTML file not found in any of the searched paths');
        // Fall back to normal enhancement flow
      }
    }

    // For other modes or if instruction popup file is not found, create optimized HTML content for the popup
    const loadingContent = createLoadingPopupContent(mode);
    const loadingPath = path.join(app.getPath('temp'), 'enhancing-prompt.html');
    fs.writeFileSync(loadingPath, loadingContent);

    // Load the loading content
    enhancementPopupWindow.loadFile(loadingPath);

    // Show the window when ready
    enhancementPopupWindow.once('ready-to-show', () => {
      enhancementPopupWindow.show();
      enhancementPopupWindow.focus();
      enhancementPopupWindow.setAlwaysOnTop(true, 'screen-saver');

      // Ensure visibility - optimized delay
      setTimeout(() => {
        if (!enhancementPopupWindow.isDestroyed()) {
          enhancementPopupWindow.show();
          enhancementPopupWindow.focus();
          enhancementPopupWindow.moveTop();
        }
      }, 100);
    });

    // Keep the enhancement popup window on top but allow interaction with other apps
    enhancementPopupWindow.on('blur', () => {
      if (!enhancementPopupWindow.isDestroyed()) {
        // When window loses focus, keep it on top but don't steal focus back
        enhancementPopupWindow.setAlwaysOnTop(true, 'floating');
        console.log('Enhancement popup lost focus, keeping alwaysOnTop with floating level');

        // Don't re-focus - this allows interaction with other applications
      }
    });

    // Add focus event to ensure alwaysOnTop when window gains focus
    enhancementPopupWindow.on('focus', () => {
      if (!enhancementPopupWindow.isDestroyed()) {
        // When window gains focus, use a higher level to ensure it's on top
        enhancementPopupWindow.setAlwaysOnTop(true, 'screen-saver');
        enhancementPopupWindow.moveTop();
        console.log('Enhancement popup gained focus, ensuring alwaysOnTop with screen-saver level');
      }
    });

    // Set up a dedicated interval to keep this window on top but not interfere with other apps
    const keepEnhancementOnTopInterval = setInterval(() => {
      if (!enhancementPopupWindow || enhancementPopupWindow.isDestroyed()) {
        clearInterval(keepEnhancementOnTopInterval);
        return;
      }

      // Use 'floating' level which keeps the window on top but allows interaction with other apps
      enhancementPopupWindow.setAlwaysOnTop(true, 'floating');

      // Only move to top if it's focused to avoid stealing focus
      if (enhancementPopupWindow.isFocused()) {
        enhancementPopupWindow.moveTop();
      }
    }, 1000); // Check every second

    // Handle window minimize event
    enhancementPopupWindow.on('minimize', () => {
      if (!enhancementPopupWindow.isDestroyed()) {
        // When window is minimized, temporarily disable alwaysOnTop
        enhancementPopupWindow.setAlwaysOnTop(false);
        console.log('Enhancement popup minimized, temporarily disabling alwaysOnTop');
      }
    });

    // Handle window restore event
    enhancementPopupWindow.on('restore', () => {
      if (!enhancementPopupWindow.isDestroyed()) {
        // When window is restored, re-enable alwaysOnTop and ensure it's visible
        enhancementPopupWindow.setAlwaysOnTop(true, 'screen-saver');
        enhancementPopupWindow.focus();
        enhancementPopupWindow.moveTop();
        console.log('Enhancement popup restored, re-enabling alwaysOnTop');

        // Double-check after a short delay
        setTimeout(() => {
          if (!enhancementPopupWindow.isDestroyed()) {
            enhancementPopupWindow.setAlwaysOnTop(true, 'screen-saver');
            enhancementPopupWindow.focus();
            enhancementPopupWindow.moveTop();
          }
        }, 100);
      }
    });

    // Clean up the reference when the window is closed
    enhancementPopupWindow.on('closed', () => {
      // Clear the keep-on-top interval
      if (keepEnhancementOnTopInterval) {
        clearInterval(keepEnhancementOnTopInterval);
      }

      enhancementPopupWindow = null;
      directEnhancementPopupShowing = false;

      // Clear any active requests
      activeRequests.clear();
    });

    try {
      console.log(`Calling enhanceTextWithContext with mode: ${mode}, model: ${selectedModel}`);

      // Generate request ID for tracking
      const requestId = Date.now().toString();
      activeRequests.set(requestId, true);

      // Enhance text with performance optimization
      const enhancedText = await enhanceTextWithContext(textToEnhance, apiKey, selectedModel, mode);

      // Check if request is still active (window not closed)
      if (!activeRequests.has(requestId)) {
        console.log('Request cancelled - window closed');
        return;
      }

      console.log('Successfully enhanced text with length:', enhancedText ? enhancedText.length : 0);

      // Create result HTML content
      const resultContent = createResultPopupContent(enhancedText, mode);
      const resultPath = path.join(app.getPath('temp'), 'enhanced-prompt.html');
      fs.writeFileSync(resultPath, resultContent);

      // Load the result content
      if (enhancementPopupWindow && !enhancementPopupWindow.isDestroyed()) {
        enhancementPopupWindow.loadFile(resultPath);
      }
    } catch (error) {
      console.error('Error in enhancement:', error);

      // Create error HTML content
      const errorContent = createErrorPopupContent(error, mode);
      const errorPath = path.join(app.getPath('temp'), 'enhancement-error.html');
      fs.writeFileSync(errorPath, errorContent);

      // Load the error content
      if (enhancementPopupWindow && !enhancementPopupWindow.isDestroyed()) {
        enhancementPopupWindow.loadFile(errorPath);
      }
    }
  } catch (error) {
    console.error('Error in showDirectEnhancementPopup:', error);
    directEnhancementPopupShowing = false;
  }
}

// Enhanced regeneration function with performance optimization
async function processRegenerationInExistingWindow(window, _store, requestedMode = null, checkClipboard = false) {
  console.log('processRegenerationInExistingWindow called with requestedMode:', requestedMode, 'checkClipboard:', checkClipboard);
  console.log('Window object exists:', !!window);

  // Validate mode parameter
  if (requestedMode && !['agent', 'general', 'answer'].includes(requestedMode)) {
    console.warn(`Invalid mode: ${requestedMode}, defaulting to general`);
    requestedMode = 'general';
  }

  // Store the original content to restore in case of error
  let originalContent = '';

  try {
    // Validate window parameter
    if (!window) {
      console.error('Invalid window object - window is null or undefined');
      return;
    }

    if (window.isDestroyed()) {
      console.error('Window is destroyed');
      return;
    }

    console.log('Window validation passed, window ID:', window.id);

    // Check if window has webContents
    if (!window.webContents) {
      console.error('Window has no webContents');
      return;
    }

    // Try to get the original content first
    try {
      originalContent = await window.webContents.executeJavaScript(
        'document.getElementById("enhancedText") ? document.getElementById("enhancedText").innerHTML : ""'
      );
      console.log('Saved original content for potential restoration');
    } catch (contentError) {
      console.error('Error saving original content:', contentError);
    }

    // Get the selected provider
    const selectedProvider = global.store.get('selected-provider', 'openai');
    console.log('Regeneration using provider:', selectedProvider);

    // Get the appropriate API key based on the provider
    let apiKey;
    if (selectedProvider === 'gemini') {
      apiKey = global.store.get('gemini-api-key', '');
      console.log('Regeneration using Gemini API key:', apiKey ? 'Key exists' : 'No key found');

      // Additional validation for Gemini API key
      if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.trim() === '') {
        console.log('Invalid or missing Gemini API key detected, treating as missing');
        apiKey = '';
      }
    } else {
      apiKey = global.store.get('openai-api-key', '');
      console.log('Regeneration using OpenAI API key:', apiKey ? 'Key exists' : 'No key found');
    }

    console.log('Regeneration checking if user is logged in:', apiKey ? 'User is logged in' : 'User is not logged in');
    if (!apiKey || apiKey.trim() === '') {
      console.error('User is not logged in, showing login alert');

      // Find the main window
      const { showLoginAlert } = require('./alert-utils.cjs');
      const { BrowserWindow } = require('electron');

      // Find the main window more reliably
      let mainWindow = null;
      const allWindows = BrowserWindow.getAllWindows();

      // First try to find a window with index.html in the URL
      mainWindow = allWindows.find(win => {
        try {
          return win.isVisible() && !win.isDestroyed() && win.webContents && win.webContents.getURL().includes('index.html');
        } catch (e) {
          return false;
        }
      });

      // If that fails, just use the first visible window that's not the current window
      if (!mainWindow) {
        mainWindow = allWindows.find(win => {
          return win !== window && win.isVisible() && !win.isDestroyed();
        });
      }

      // If we still don't have a main window, create one
      if (!mainWindow) {
        console.log('No main window found, creating one');
        try {
          const { app } = require('electron');
          mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            show: true,
            webPreferences: {
              nodeIntegration: true,
              contextIsolation: false
            }
          });

          // Load the main app page
          const appUrl = 'file://' + require('path').join(app.getAppPath(), 'build', 'index.html');
          mainWindow.loadURL(appUrl);
        } catch (e) {
          console.error('Error creating main window:', e);
        }
      }

      if (mainWindow) {
        console.log('Showing login alert for regeneration');

        // Close any other enhancement popups that might be open
        const otherPopups = BrowserWindow.getAllWindows().filter(win => {
          return win !== mainWindow &&
                 win !== window &&
                 !win.isDestroyed() &&
                 win.isVisible() &&
                 win.getTitle() !== 'Login Required';
        });

        otherPopups.forEach(popup => {
          console.log('Closing other enhancement popup to show login alert');
          popup.close();
        });

        // Make sure the main window is visible and in the foreground
        mainWindow.show();
        mainWindow.focus();
        mainWindow.moveTop();

        // Navigate to the setup page for API key entry instead of just login
        // This ensures users can directly enter their API key for the selected provider
        try {
          if (selectedProvider === 'gemini') {
            console.log('Navigating to setup page for Gemini API key entry');
            mainWindow.webContents.send('navigate-to-setup');
          } else {
            console.log('Navigating to login page for OpenAI');
            mainWindow.webContents.send('navigate-to-login');
          }
        } catch (navError) {
          console.error('Error sending navigation message:', navError);
          // Fallback to login page if navigation fails
          mainWindow.webContents.send('navigate-to-login');
        }

        // Make sure the main window is visible and in front
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
        mainWindow.focus();
        mainWindow.moveTop();

        console.log('REGEN: Main window is now visible and focused');

        // ALWAYS show login alert first before doing anything else
        // The navigation to setup page is now handled inside showLoginAlert with a delay
        showLoginAlert(mainWindow);

        console.log('REGEN: Login alert shown');

        // Wait a moment to ensure the alert is shown before closing the window
        setTimeout(() => {
          // Close the current enhancement window
          if (window && !window.isDestroyed()) {
            console.log('REGEN: Closing enhancement window after showing login alert');
            window.close();
          }
        }, 1000); // Longer delay to ensure alert is shown first

        // Make sure the main window stays in the foreground
        setTimeout(() => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.moveTop();
          }
        }, 300);
      } else {
        console.error('Main window not found for showing login alert');
        // Show error message in the current window if we can't show the login alert
        if (window && !window.isDestroyed() && window.webContents) {
          await window.webContents.executeJavaScript(`
            document.getElementById('enhancedText').innerHTML = '<div style="color: #b91c1c; padding: 10px; background-color: #fee2e2; border-radius: 6px;">Error: You need to set up your ${selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key first. Please go to the setup page to configure your API key.</div>';
          `);
        }
      }

      return;
    }

    const selectedModel = global.store.get('selected-model', 'gpt-4o-mini');
    console.log('Regeneration using model:', selectedModel);

    // Determine whether to use clipboard or cached text
    let textToEnhance;

    // Always check clipboard first if requested
    if (checkClipboard) {
      console.log('checkClipboard is true, getting fresh text from clipboard');
      textToEnhance = clipboard.readText('selection') || clipboard.readText();
      console.log('Fresh clipboard text available:', !!textToEnhance);
    } else {
      // Use cached text if available and not checking clipboard
      textToEnhance = global.lastUsedText || lastUsedText;
      console.log('Using cached text:', !!textToEnhance);

      // Fall back to clipboard if needed
      if (!textToEnhance || textToEnhance.trim() === '') {
        console.log('No cached text, falling back to clipboard');
        textToEnhance = clipboard.readText('selection') || clipboard.readText();
        console.log('Clipboard text available:', !!textToEnhance);
      }
    }

    // Get the current mode from the window if not provided
    if (!requestedMode) {
      try {
        const currentMode = await window.webContents.executeJavaScript('currentTab || "general"');
        console.log('Retrieved current mode from window:', currentMode);
        requestedMode = currentMode;
      } catch (modeError) {
        console.error('Error getting current mode from window:', modeError);
        requestedMode = 'general';
      }
    }

    if (!textToEnhance || textToEnhance.trim() === '') {
      console.error('No text found to enhance');
      await window.webContents.executeJavaScript(`
        document.getElementById('enhancedText').innerHTML = '<div style="color: #b91c1c; padding: 10px; background-color: #fee2e2; border-radius: 6px;">No text found to enhance. Please copy some text and try again.</div>';
      `);
      return;
    }

    // Store for future use
    lastUsedText = textToEnhance;
    global.lastUsedText = textToEnhance;
    console.log('Text to enhance (first 50 chars):', textToEnhance.substring(0, 50));

    // Determine mode first
    let mode = requestedMode;
    if (!mode || !['agent', 'general', 'answer'].includes(mode)) {
      try {
        console.log('Requested mode is invalid or not provided, trying to get currentTab from window');
        const currentTabResult = await window.webContents.executeJavaScript('typeof currentTab !== "undefined" ? currentTab : null');
        console.log('Current tab result:', currentTabResult);
        mode = (currentTabResult && ['agent', 'general', 'answer'].includes(currentTabResult)) ?
          currentTabResult : 'general';
      } catch (error) {
        console.error('Error getting currentTab, defaulting to general mode:', error);
        mode = 'general';
      }
    }
    // Store the mode in the window for future reference
    try {
      await window.webContents.executeJavaScript(`currentTab = "${mode}";`);
      console.log('Updated currentTab in window to:', mode);
    } catch (error) {
      console.error('Error updating currentTab in window:', error);
    }
    console.log('Using mode for loading message:', mode);

    // Show loading state with appropriate message based on mode
    const loadingMessage = mode === 'agent' ? 'Regenerating agent prompt...' :
                         mode === 'answer' ? 'Generating new answer...' :
                         'Regenerating enhanced prompt...';

    await window.webContents.executeJavaScript(
      'document.getElementById("enhancedText").innerHTML = "<div style=\\"text-align: center;\\"><div style=\\"border: 4px solid rgba(0, 0, 0, 0.1); width: 36px; height: 36px; border-radius: 50%; border-left-color: #4f46e5; animation: spin 1s linear infinite; margin: 20px auto;\\"></div><p>" + ' + JSON.stringify(loadingMessage) + ' + "</p></div>";'
    );

    // Use the mode we determined earlier
    console.log('Using enhancement mode:', mode);

    // Always force regeneration without caching when using the regenerate button
    const noCache = true;
    console.log('Forcing regeneration without cache');

    // If this is answer mode, we need to show the instruction popup instead
    if (mode === 'answer') {
      console.log('Answer mode detected in processRegenerationInExistingWindow, showing instruction popup');

      // Close the current window
      if (window && !window.isDestroyed()) {
        window.close();
      }

      // Show the instruction popup directly instead of using showDirectEnhancementPopup
      // to avoid circular reference
      try {
        console.log('Creating instruction popup window directly');
        const { BrowserWindow } = require('electron');
        const path = require('path');
        const fs = require('fs');

        // Create a new window for the instruction popup
        const instructionPopupWindow = new BrowserWindow({
          width: 550,
          height: 500,
          show: false,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
          }
        });

        // Find the instruction popup HTML file
        const possiblePaths = [
          path.join(app.getAppPath(), 'instruction-popup.html'),
          path.join(app.getAppPath(), 'dist', 'instruction-popup.html'),
          path.join(__dirname, '..', 'instruction-popup.html'),
          path.join(__dirname, '..', 'dist', 'instruction-popup.html'),
          path.join(process.cwd(), 'instruction-popup.html'),
          path.join(process.cwd(), 'dist', 'instruction-popup.html'),
          path.join(process.cwd(), 'electron', 'instruction-popup.html')
        ];

        console.log('Searching for instruction-popup.html in the following paths:');
        const instructionPopupPath = possiblePaths.find(p => {
          const exists = fs.existsSync(p);
          console.log(` - ${p} (${exists ? 'EXISTS' : 'NOT FOUND'})`);
          return exists;
        });

        if (instructionPopupPath) {
          console.log('Found instruction popup at:', instructionPopupPath);
          instructionPopupWindow.loadFile(instructionPopupPath);

          // Send the original text to the instruction popup
          instructionPopupWindow.webContents.once('did-finish-load', () => {
            instructionPopupWindow.webContents.send('original-text', textToEnhance);
            console.log('Sent original text to instruction popup:', textToEnhance.substring(0, 50) + (textToEnhance.length > 50 ? '...' : ''));
          });

          // Show the window when ready
          instructionPopupWindow.once('ready-to-show', () => {
            instructionPopupWindow.show();
            instructionPopupWindow.focus();
            console.log('Instruction popup window is now visible');
          });

          // Set up IPC handlers for the instruction popup
          setupInstructionPopupHandlers(instructionPopupWindow, apiKey, selectedModel, textToEnhance);
        } else {
          console.error('Instruction popup HTML file not found in any of the searched paths');
          // Show an error message
          if (window && !window.isDestroyed() && window.webContents) {
            await window.webContents.executeJavaScript(`
              document.getElementById('enhancedText').innerHTML = '<div style="color: #b91c1c; padding: 10px; background-color: #fee2e2; border-radius: 6px;">Error: Could not find instruction popup HTML file.</div>';
            `);
          }
        }
      } catch (error) {
        console.error('Error creating instruction popup window:', error);
        // Show an error message
        if (window && !window.isDestroyed() && window.webContents) {
          await window.webContents.executeJavaScript(`
            document.getElementById('enhancedText').innerHTML = '<div style="color: #b91c1c; padding: 10px; background-color: #fee2e2; border-radius: 6px;">Error: ${error.message}</div>';
          `);
        }
      }
      return;
    }

    // For other modes, process normally
    console.log(`Processing regeneration for mode: ${mode}`);

    // Use performance optimizer for enhanced text
    console.log('Calling enhanceTextWithContext with noCache:', noCache);
    const enhancedText = await enhanceTextWithContext(textToEnhance, apiKey, selectedModel, mode, noCache);
    console.log('enhanceTextWithContext completed, result available:', !!enhancedText);

    // Update window with result
    if (enhancedText) {
      // Make sure the window is still valid
      if (window.isDestroyed() || !window.webContents) {
        console.error('Window is no longer valid after enhancement');
        return;
      }

      // Escape any backticks in the text to prevent JavaScript injection
      const escapedText = enhancedText.replace(/`/g, '\\`').replace(/\$/g, '\\$');
      console.log('Updating window with enhanced text');

      try {
        await window.webContents.executeJavaScript(`
          document.getElementById('enhancedText').innerText = \`${escapedText}\`;
        `);
        console.log('Window updated successfully');
      } catch (updateError) {
        console.error('Error updating window with enhanced text:', updateError);

        // Try a more robust approach
        try {
          const safeText = JSON.stringify(enhancedText);
          await window.webContents.executeJavaScript(`
            document.getElementById('enhancedText').innerText = JSON.parse(${safeText});
          `);
          console.log('Window updated successfully using JSON approach');
        } catch (jsonError) {
          console.error('Error updating window with JSON approach:', jsonError);
          throw jsonError; // Let the outer catch handle it
        }
      }
    } else {
      console.error('No enhanced text returned');
      await window.webContents.executeJavaScript(`
        document.getElementById('enhancedText').innerHTML = '<div style="color: #b91c1c; padding: 10px; background-color: #fee2e2; border-radius: 6px;">Error: Failed to generate enhanced text. Please try again.</div>';
      `);
    }
  } catch (error) {
    console.error('Error processing regeneration:', error);
    try {
      if (window && !window.isDestroyed() && window.webContents) {
        // Try to restore the original content if we have it
        if (originalContent) {
          try {
            await window.webContents.executeJavaScript(`
              document.getElementById('enhancedText').innerHTML = ${JSON.stringify(originalContent)};
            `);
            console.log('Restored original content after error');
          } catch (restoreError) {
            console.error('Error restoring original content:', restoreError);
          }
        }

        // Show the error message
        const errorMessage = error.message || 'Unknown error occurred';
        const safeErrorMessage = errorMessage.replace(/[\\"']/g, (match) => '\\' + match);

        await window.webContents.executeJavaScript(
          'const errorDiv = document.createElement("div");' +
          'errorDiv.style.color = "#b91c1c";' +
          'errorDiv.style.padding = "10px";' +
          'errorDiv.style.backgroundColor = "#fee2e2";' +
          'errorDiv.style.borderRadius = "6px";' +
          'errorDiv.style.marginTop = "10px";' +
          'errorDiv.textContent = "Error: ' + safeErrorMessage + '";' +
          'const target = document.getElementById("enhancedText") || document.body;' +
          'target.appendChild(errorDiv);'
        );
      }
    } catch (displayError) {
      console.error('Error displaying error message:', displayError);
    }
  }
}

// Optimized confirmation handler
const handleConfirmEnhancement = async (event, text) => {
  // Check if the event is coming from the enhancement popup window
  // If enhancementPopupWindow is null or undefined, we'll still process the event
  // This allows handling events from both the popup window and custom events
  if (enhancementPopupWindow && event.sender && event.sender.id !== enhancementPopupWindow.webContents.id) {
    console.log('Ignoring confirm-enhancement event from unknown sender');
    return;
  }

  console.log('Processing confirm-enhancement event');

  // Write to clipboard
  clipboard.writeText(text);
  console.log('Text copied to clipboard in direct-enhancer');

  // We don't need to do anything else here - the protocol handler in electron-main.cjs
  // will handle the auto-paste functionality and showing success messages
  // This prevents duplicate paste attempts and keeps the popup responsive
}

// Note: The old window management code has been removed in favor of keeping the window open

// Enhanced clipboard monitoring for rapid changes
function startClipboardMonitoring() {
  if (clipboardCheckInterval) return;

  clipboardCheckInterval = setInterval(() => {
    const currentText = clipboard.readText();
    if (currentText !== clipboardCache) {
      clipboardCache = currentText;
      // Notify any active enhancement windows of clipboard change
      if (enhancementPopupWindow && !enhancementPopupWindow.isDestroyed()) {
        enhancementPopupWindow.webContents.send('clipboard-updated', currentText);
      }
    }
  }, 250); // Check every 250ms for rapid changes
}

function stopClipboardMonitoring() {
  if (clipboardCheckInterval) {
    clearInterval(clipboardCheckInterval);
    clipboardCheckInterval = null;
  }
}

// Helper function to check if the API key is set and show the login alert if needed
function checkApiKeyAndShowLoginAlert(mainWindow, store) {
  // Get the selected provider
  const selectedProvider = store.get('selected-provider', 'openai');
  console.log('Checking API key for provider:', selectedProvider);

  // Get the appropriate API key based on the provider
  let apiKey;
  if (selectedProvider === 'gemini') {
    apiKey = store.get('gemini-api-key', '');
    console.log('Checking Gemini API key:', apiKey ? 'API key exists' : 'No API key');

    // Additional validation for Gemini API key
    if (!apiKey || apiKey === 'undefined' || apiKey === 'null' || apiKey.trim() === '') {
      console.log('Invalid or missing Gemini API key detected, treating as missing');
      apiKey = '';
    }
  } else {
    apiKey = store.get('openai-api-key', '');
    console.log('Checking OpenAI API key:', apiKey ? 'API key exists' : 'No API key');
  }

  // Check if API key is empty or not properly set
  if (!apiKey || apiKey.trim() === '') {
    console.log('API key not set or empty, showing login alert');

    // Close any existing enhancement popup windows first
    const { BrowserWindow } = require('electron');
    const enhancementPopups = BrowserWindow.getAllWindows().filter(win => {
      return win !== mainWindow &&
             !win.isDestroyed() &&
             win.isVisible() &&
             win.getTitle() !== 'Login Required';
    });

    enhancementPopups.forEach(popup => {
      console.log('Closing enhancement popup to show login alert');
      popup.close();
    });

    // Import the showLoginAlert function from alert-utils.cjs
    const { showLoginAlert } = require('./alert-utils.cjs');

    // Show the login alert
    showLoginAlert(mainWindow);
    return false;
  }

  return true;
}

// Function to set up IPC handlers for the instruction popup
function setupInstructionPopupHandlers(window, apiKey, model, originalText) {
  // Handler for the request-enhancement event with instructions
  const handleRequestEnhancementWithInstructions = async (event, _promptType, modelId, _noCache, instructions) => {
    // Only process events from this window
    if (event.sender.id !== window.webContents.id) {
      return;
    }

    console.log('Processing request-enhancement-with-instructions with instructions:', instructions);

    try {
      if (!apiKey) {
        window.webContents.send('enhancement-error', 'API key not set');
        return;
      }

      // Use the provided model or fall back to the stored model
      const selectedModel = modelId || model;

      // Show loading state in the window
      await window.webContents.executeJavaScript(`
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Generating...';
      `);

      // Generate the response using the answer-with-instructions mode
      const enhancedText = await enhanceTextWithContext(
        originalText,
        apiKey,
        selectedModel,
        'answer-with-instructions',
        instructions
      );

      // Send the result back to the window
      window.webContents.send('enhancement-result', enhancedText);

      // Re-enable the submit button
      await window.webContents.executeJavaScript(`
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Response';
      `);
    } catch (error) {
      console.error('Error generating response with instructions:', error);
      window.webContents.send('enhancement-error', error.message);

      // Re-enable the submit button
      await window.webContents.executeJavaScript(`
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Response';
      `);
    }
  };

  // Register the handler for this specific window
  ipcMain.on('request-enhancement', (event, promptType, modelId, noCache, instructions) => {
    if (promptType === 'answer-with-instructions') {
      handleRequestEnhancementWithInstructions(event, promptType, modelId, noCache, instructions);
    }
  });

  // Clean up when window is closed
  window.on('closed', () => {
    // Remove the specific handler to prevent memory leaks
    ipcMain.removeAllListeners('request-enhancement');
  });
}

// Initialize performance optimizer
const initializeOptimizer = async () => {
  const optimizer = PerformanceOptimizer.getInstance();
  optimizer.prefetchCommon();
  return optimizer;
};

// Register IPC handlers
ipcMain.on('confirm-enhancement', handleConfirmEnhancement);

// Add handler for refresh-clipboard-text
ipcMain.on('refresh-clipboard-text', (event) => {
  console.log('Received refresh-clipboard-text event');
  try {
    // Get the text from clipboard
    const clipboardText = clipboard.readText('selection') || clipboard.readText();
    console.log('Clipboard text length:', clipboardText.length);

    // Send the text back to the renderer
    if (event.sender) {
      event.sender.send('original-text', clipboardText);
      console.log('Sent clipboard text to renderer');
    } else {
      console.error('Event sender is not available');
    }
  } catch (error) {
    console.error('Error in refresh-clipboard-text handler:', error);
  }
});

// Export functions and variables
module.exports = {
  showDirectEnhancementPopup,
  enhanceText,
  enhanceTextWithContext,
  getDirectEnhancementPopupShowing,
  resetDirectEnhancementPopupShowing,
  processRegenerationInExistingWindow,
  handleConfirmEnhancement,
  initializeOptimizer,
  startClipboardMonitoring,
  stopClipboardMonitoring,
  checkApiKeyAndShowLoginAlert,
  get directEnhancementPopupShowing() {
    return directEnhancementPopupShowing;
  },
  set directEnhancementPopupShowing(value) {
    directEnhancementPopupShowing = value;
  },
  // Export the enhancementPopupWindow reference for other modules to use
  get enhancementPopupWindow() {
    return enhancementPopupWindow;
  }
};