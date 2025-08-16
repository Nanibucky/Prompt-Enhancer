// electron/gemini-service.ts
import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google/generative-ai';

// Define the Gemini model types for consistent usage across the application
export type GeminiModel = 'gemini-pro' | 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-1.5-pro-latest' | 'gemini-ultra';

class GeminiService {
  async enhancePrompt(
    originalText: string,
    systemPrompt: string,
    apiKey: string,
    model: GeminiModel = 'gemini-pro',
    noCache: boolean = false
  ): Promise<string> {
    try {
      // Initialize the Gemini API
      const genAI = new GoogleGenerativeAI(apiKey);
      const geminiModel = genAI.getGenerativeModel({ model });

      // Prepare the prompt with system instructions and user content
      const fullPrompt = `${systemPrompt}\n\nUser input: ${originalText}${
        noCache
          ? `\n\nIMPORTANT: This is a regeneration request. You MUST provide a completely different variation of the enhanced prompt than any previous version. Be creative and offer a distinctly different enhancement while maintaining the original meaning. Timestamp: ${Date.now()}`
          : ''
      }`;

      // Set generation config similar to OpenAI settings
      const generationConfig: GenerationConfig = {
        temperature: 0.9,
        maxOutputTokens: 500,
      };

      // Generate content
      const result = await geminiModel.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig,
      });

      const response = result.response;
      let enhancedText = response.text().trim();

      // Apply the same cleanup as in OpenAI service
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
      console.error('Gemini API error:', error);
      throw new Error('Failed to enhance prompt. Please check your Gemini API key and try again.');
    }
  }

  getAvailableModels(): { id: GeminiModel; name: string; description: string }[] {
    return [
      {
        id: 'gemini-ultra',
        name: 'Gemini Ultra',
        description: 'Most powerful Gemini model with advanced reasoning'
      },
      {
        id: 'gemini-1.5-pro-latest',
        name: 'Gemini 1.5 Pro Latest',
        description: 'Latest version with cutting-edge capabilities'
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Advanced model with improved capabilities'
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast and efficient model for quick responses'
      },
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        description: 'Balanced model for most tasks'
      }
    ];
  }
}

export const gemini = new GeminiService();
