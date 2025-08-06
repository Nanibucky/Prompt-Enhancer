// electron/openai-service.ts
import OpenAI from 'openai';

// Define the OpenAI model types for consistent usage across the application
export type OpenAIModel = 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4o' | 'gpt-4o-mini';

class OpenAIService {
  async enhancePrompt(
    originalText: string,
    systemPrompt: string,
    apiKey: string,
    model: OpenAIModel = 'gpt-3.5-turbo',
    noCache: boolean = false,
    instructions: string = ''
  ): Promise<string> {
    const openai = new OpenAI({
      apiKey,
    });

    try {
      // Build the user message with optional instructions
      let userMessage = originalText;
      
      if (instructions.trim()) {
        userMessage = `Instructions: ${instructions.trim()}\n\nText to process:\n${originalText}`;
      }
      
      if (noCache) {
        userMessage += `\n\nIMPORTANT: This is a regeneration request. You MUST provide a completely different variation of the enhanced prompt than any previous version. Be creative and offer a distinctly different enhancement while maintaining the original meaning. Timestamp: ${Date.now()}`;
      }

      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        max_tokens: 500,
        temperature: 0.9, // Higher temperature for maximum variation
      });

      let enhancedText = response.choices[0].message.content.trim();
      // Remove the output format prefixes if present
      enhancedText = enhancedText.replace(/^\[ENHANCED\]\s*/i, '');
      enhancedText = enhancedText.replace(/^\[ANSWER\]\s*/i, '');
      enhancedText = enhancedText.replace(/^\[AGENT_TASK\]\s*/i, '');
      enhancedText = enhancedText.replace(/^\[Enhanced Prompt\]\s*/i, '');
      enhancedText = enhancedText.replace(/^\[Enhanced Agent Prompt\]\s*/i, '');
      enhancedText = enhancedText.replace(/^\[Greeting Protocol\]\s*/i, '');
      enhancedText = enhancedText.replace(/^improved prompt:\s*/i, '');
      enhancedText = enhancedText.replace(/^enhanced prompt:\s*/i, '');

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

      // Remove any instructions about variations that might have been included
      enhancedText = enhancedText.replace(/\bIf this is a (request|regeneration).*?different (version|variation).*$/i, '');
      enhancedText = enhancedText.replace(/\bNote:.*?different variation.*$/i, '');
      enhancedText = enhancedText.replace(/\bNote:.*?provide a different.*$/i, '');
      enhancedText = enhancedText.replace(/\bIMPORTANT:.*?regeneration request.*$/i, '');
      enhancedText = enhancedText.replace(/\bThis is a regeneration request.*$/i, '');
      enhancedText = enhancedText.replace(/\bYou MUST provide.*?different variation.*$/i, '');
      enhancedText = enhancedText.replace(/\bBe creative and offer.*$/i, '');
      enhancedText = enhancedText.trim();
      return enhancedText;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to enhance prompt. Please check your API key and try again.');
    }
  }

  getAvailableModels(): { id: OpenAIModel; name: string; description: string }[] {
    return [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and cost-effective for most tasks'
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'More powerful with better reasoning capabilities'
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Latest model with improved performance'
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Efficient version of GPT-4o with great performance'
      }
    ];
  }
}

export const openai = new OpenAIService();