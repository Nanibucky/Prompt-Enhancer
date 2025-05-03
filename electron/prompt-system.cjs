// electron/prompt-system.cjs
// A simplified CommonJS version of the prompt-system.ts file

class PromptSystemManager {
  static instance = null;

  static getInstance() {
    if (!PromptSystemManager.instance) {
      PromptSystemManager.instance = new PromptSystemManager();
    }
    return PromptSystemManager.instance;
  }

  constructor() {
    this.initialized = true;
    console.log('PromptSystemManager initialized');
  }

  analyzeMessage(text) {
    // Simple analysis of the message
    const wordCount = text.split(/\s+/).length;
    const hasQuestion = text.includes('?');
    const hasCode = text.includes('```') || /\b(function|class|const|let|var|import|export)\b/.test(text);

    return {
      length: {
        characters: text.length,
        words: wordCount,
        isBrief: wordCount < 30,
        isDetailed: wordCount > 100
      },
      type: {
        isQuestion: hasQuestion,
        containsCode: hasCode,
        isPotentialPrompt: true
      },
      context: {
        platform: this.detectPlatform(text),
        tone: this.detectTone(text),
        domain: this.detectDomain(text)
      }
    };
  }

  detectPlatform(text) {
    // Very simple platform detection
    if (text.includes('@') && text.includes('slack')) return 'slack';
    if (text.includes('tweet') || text.includes('twitter')) return 'twitter';
    if (text.includes('whatsapp') || text.includes('message me')) return 'whatsapp';
    return 'general';
  }

  detectTone(text) {
    // Simple tone detection
    const lowerText = text.toLowerCase();
    if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('immediately')) {
      return 'urgent';
    }
    if (lowerText.includes('please') || lowerText.includes('thank you') || lowerText.includes('appreciate')) {
      return 'polite';
    }
    if (lowerText.includes('formal') || lowerText.includes('professional')) {
      return 'formal';
    }
    if (lowerText.includes('casual') || lowerText.includes('friendly') || lowerText.includes('informal')) {
      return 'casual';
    }
    return 'neutral';
  }

  detectDomain(text) {
    // Simple domain detection
    const lowerText = text.toLowerCase();
    if (lowerText.includes('code') || lowerText.includes('programming') || lowerText.includes('function')) {
      return 'programming';
    }
    if (lowerText.includes('business') || lowerText.includes('marketing') || lowerText.includes('sales')) {
      return 'business';
    }
    if (lowerText.includes('science') || lowerText.includes('research') || lowerText.includes('study')) {
      return 'academic';
    }
    return 'general';
  }

  generatePrompt(analysis, mode) {
    // Generate a system prompt based on the analysis and mode
    let prompt = '';
    const fs = require('fs');
    const path = require('path');

    try {
      // Get the base directory (assuming we're in electron folder)
      const baseDir = path.resolve(__dirname, '..');

      // Load the appropriate prompt file based on mode
      let promptFile = '';
      if (mode === 'agent') {
        promptFile = path.join(baseDir, 'agent-enhancement-prompt.txt');
      } else if (mode === 'answer') {
        promptFile = path.join(baseDir, 'answer-enhancement-prompt.txt');
      } else {
        // Default 'general' mode
        promptFile = path.join(baseDir, 'general-enhancement-prompt.txt');
      }

      // First try to load the mode-specific prompt
      if (fs.existsSync(promptFile)) {
        prompt = fs.readFileSync(promptFile, 'utf8');
        console.log(`Loaded ${mode} prompt from file: ${promptFile}`);
      } else {
        // If mode-specific prompt doesn't exist, fall back to the main enhanced system prompt
        const mainPromptFile = path.join(baseDir, 'enhanced-system-prompt.txt');
        if (fs.existsSync(mainPromptFile)) {
          prompt = fs.readFileSync(mainPromptFile, 'utf8');
          console.log(`Loaded main enhanced system prompt from file: ${mainPromptFile}`);
        } else {
          console.warn(`Could not find prompt files. Using fallback prompt for ${mode} mode.`);
          // Fallback prompts if files don't exist
          if (mode === 'agent') {
            prompt = `You are an AI assistant specialized in creating effective prompts for other AI systems.
Your task is to reformat the user's input into a clear, structured prompt that will get optimal results from an AI coding assistant.

Consider the following context:
- Domain: ${analysis.context.domain}
- Tone: ${analysis.context.tone}
- Length: ${analysis.length.isDetailed ? 'Detailed' : analysis.length.isBrief ? 'Brief' : 'Moderate'}

Format the prompt to be clear, specific, and actionable. Include:
1. A clear statement of the task or problem
2. Any relevant context or constraints
3. The expected format or structure of the response
4. Any specific requirements or preferences`;
          } else if (mode === 'answer') {
            prompt = `You are a helpful assistant that provides direct, concise, and accurate answers.
Respond directly to the user's question or request without unnecessary preamble.
Be thorough but efficient with your response.

Consider the following context:
- Domain: ${analysis.context.domain}
- Tone: ${analysis.context.tone}
- Length: ${analysis.length.isDetailed ? 'Detailed' : analysis.length.isBrief ? 'Brief' : 'Moderate'}`;
          } else {
            prompt = `You are an AI assistant specialized in enhancing user prompts to be more effective.
Your task is to improve the user's input while preserving their original intent.

Consider the following context:
- Domain: ${analysis.context.domain}
- Tone: ${analysis.context.tone}
- Length: ${analysis.length.isDetailed ? 'Detailed' : analysis.length.isBrief ? 'Brief' : 'Moderate'}

Enhance the prompt to be:
1. Clear and specific
2. Well-structured
3. Contextually appropriate
4. Effective for the intended platform

Maintain the user's original intent and tone while making the prompt more effective.`;
          }
        }
      }

      // Add context information to the prompt
      prompt += `

Consider the following context:
- Domain: ${analysis.context.domain}
- Tone: ${analysis.context.tone}
- Length: ${analysis.length.isDetailed ? 'Detailed' : analysis.length.isBrief ? 'Brief' : 'Moderate'}`;

    } catch (error) {
      console.error('Error loading prompt file:', error);
      // Fallback to original prompts if there's an error
      if (mode === 'agent') {
        prompt = `You are an AI assistant specialized in creating effective prompts for other AI systems.
Your task is to reformat the user's input into a clear, structured prompt that will get optimal results from an AI coding assistant.

Consider the following context:
- Domain: ${analysis.context.domain}
- Tone: ${analysis.context.tone}
- Length: ${analysis.length.isDetailed ? 'Detailed' : analysis.length.isBrief ? 'Brief' : 'Moderate'}

Format the prompt to be clear, specific, and actionable. Include:
1. A clear statement of the task or problem
2. Any relevant context or constraints
3. The expected format or structure of the response
4. Any specific requirements or preferences`;
      } else if (mode === 'answer') {
        prompt = `You are a helpful assistant that provides direct, concise, and accurate answers.
Respond directly to the user's question or request without unnecessary preamble.
Be thorough but efficient with your response.

Consider the following context:
- Domain: ${analysis.context.domain}
- Tone: ${analysis.context.tone}
- Length: ${analysis.length.isDetailed ? 'Detailed' : analysis.length.isBrief ? 'Brief' : 'Moderate'}`;
      } else {
        prompt = `You are an AI assistant specialized in enhancing user prompts to be more effective.
Your task is to improve the user's input while preserving their original intent.

Consider the following context:
- Domain: ${analysis.context.domain}
- Tone: ${analysis.context.tone}
- Length: ${analysis.length.isDetailed ? 'Detailed' : analysis.length.isBrief ? 'Brief' : 'Moderate'}

Enhance the prompt to be:
1. Clear and specific
2. Well-structured
3. Contextually appropriate
4. Effective for the intended platform

Maintain the user's original intent and tone while making the prompt more effective.`;
      }
    }

    return prompt;
  }
}

module.exports = PromptSystemManager;
