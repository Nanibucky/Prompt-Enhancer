// electron/prompt-system.ts
import MessagePatternDetector from './message-patterns.js';
interface PromptContext {
  platform?: 'email' | 'whatsapp' | 'slack' | 'twitter' | 'linkedin' | 'teams' | 'discord' | 'telegram' | 'sms' | 'general';
  tone?: 'formal' | 'informal' | 'professional' | 'friendly' | 'technical' | 'casual' | 'business';
  purpose?: 'greeting' | 'request' | 'response' | 'explanation' | 'persuasion';
  language?: 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'ko' | 'ar';
  confidence?: number;
}

interface MessageAnalysis {
  context: PromptContext;
  hasEmoji: boolean;
  hasSalutation: boolean;
  messageLength: number;
  isQuestion: boolean;
  containsName: boolean;
  containsUrl: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
}

class PromptSystemManager {
  private static instance: PromptSystemManager;
  private patternDetector: MessagePatternDetector;
  private emailRegex = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  private urlRegex = /(https?:\/\/[^\s]+)/g;
  private emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu;
  private salutationRegex = /^(hi|hello|hey|dear|greetings|good\s+(morning|afternoon|evening|day))\b/i;
  private questionRegex = /\?|what|how|why|when|where|which|who|would|could|can|should/i;

  private constructor() {
    this.patternDetector = new MessagePatternDetector();
  }

  public static getInstance(): PromptSystemManager {
    if (!PromptSystemManager.instance) {
      PromptSystemManager.instance = new PromptSystemManager();
    }
    return PromptSystemManager.instance;
  }

  analyzeMessage(text: string): MessageAnalysis {
    const analysis: MessageAnalysis = {
      context: this.detectContext(text),
      hasEmoji: this.emojiRegex.test(text),
      hasSalutation: this.salutationRegex.test(text),
      messageLength: text.length,
      isQuestion: this.questionRegex.test(text),
      containsName: this.detectName(text),
      containsUrl: this.urlRegex.test(text),
      sentiment: this.detectSentiment(text)
    };

    return analysis;
  }

  private detectContext(text: string): PromptContext {
    const context: PromptContext = {};

    // Use the MessagePatternDetector for more accurate platform and tone detection
    const patternResult = this.patternDetector.detectPlatform(text);
    context.platform = patternResult.platform as any;
    context.tone = patternResult.tone as any;
    context.confidence = patternResult.confidence;

    console.log('Pattern detection result:', patternResult);

    // Detect purpose
    if (this.salutationRegex.test(text) && text.split(' ').length < 10) {
      context.purpose = 'greeting';
    } else if (this.questionRegex.test(text)) {
      context.purpose = 'request';
    } else if (/thank|appreciate|grateful/i.test(text)) {
      context.purpose = 'response';
    } else if (/because|due to|resulted in|therefore/i.test(text)) {
      context.purpose = 'explanation';
    } else if (/please|could you|would you|important/i.test(text)) {
      context.purpose = 'persuasion';
    }

    return context;
  }

  private detectName(text: string): boolean {
    const namePatterns = [
      /(?:i('m| am)|my name is|this is)\s+([A-Z][a-z]+)/i,
      /(?:hi|hello|hey),?\s*(?:i('m| am)|this is)\s+([A-Z][a-z]+)/i,
      /^([A-Z][a-z]+)\s+here/i
    ];

    return namePatterns.some(pattern => pattern.test(text));
  }

  private detectSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'awesome', 'excellent', 'happy', 'thanks', 'appreciate', 'love', 'excited'];
    const negativeWords = ['bad', 'terrible', 'awful', 'poor', 'sad', 'sorry', 'hate', 'disappointed', 'frustrated'];

    const positiveCount = positiveWords.filter(word => text.toLowerCase().includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.toLowerCase().includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  generatePrompt(analysis: MessageAnalysis, mode: 'agent' | 'general' | 'answer'): string {
    if (mode === 'agent') {
      return this.generateAgentPrompt(analysis);
    } else if (mode === 'answer') {
      return this.generateAnswerPrompt(analysis);
    } else {
      return this.generateGeneralPrompt(analysis);
    }
  }

  private generateAgentPrompt(analysis: MessageAnalysis): string {
    // Handle greetings specially for agent mode
    if (analysis.context.purpose === 'greeting' && analysis.containsName) {
      return `You are specialized in formatting greeting messages for AI assistants. When you receive a greeting that includes a name, maintain the personal introduction format but structure it for AI processing.

For example, "Hi this is Tharun" should become:
# Greeting Protocol
1. **Message Type**: Personal Introduction
2. **Name Identified**: Tharun
3. **Appropriate Responses**:
   - Acknowledge the introduction
   - Return appropriate greeting
   - Optionally inquire about purpose

DO NOT convert personal introductions into generic task instructions. Preserve the greeting nature of the message.`;
    }

    // Standard agent prompt
    return `You are a specialized prompt engineer for AI coding assistants like Cursor, Augment, and Trae.

Message Context:
- Platform: ${analysis.context.platform || 'unknown'}
- Tone: ${analysis.context.tone || 'professional'}
- Purpose: ${analysis.context.purpose || 'unknown'}
- Contains Name: ${analysis.containsName}
- Is Question: ${analysis.isQuestion}
- Confidence: ${analysis.context.confidence || 'unknown'}

Convert the input into structured instructions that preserve the original intent while being optimized for AI assistants.`;
  }

  private generateGeneralPrompt(analysis: MessageAnalysis): string {
    let systemPrompt = `You are an expert at enhancing messages for different communication platforms.

Message Analysis:
- Platform: ${analysis.context.platform || 'unknown'}
- Tone: ${analysis.context.tone || 'professional'}
- Purpose: ${analysis.context.purpose || 'unknown'}
- Sentiment: ${analysis.sentiment}
- Contains Emoji: ${analysis.hasEmoji}
- Has Salutation: ${analysis.hasSalutation}
- Confidence: ${analysis.context.confidence || 'unknown'}

Enhancement Guidelines:
`;

    // Get platform-specific guidelines from the MessagePatternDetector
    const platformGuidelines = this.patternDetector.generatePlatformGuidelines(
      analysis.context.platform as string || 'default',
      analysis.context.tone as string || 'default'
    );

    systemPrompt += platformGuidelines;

    // Add purpose-specific guidelines
    if (analysis.context.purpose === 'greeting') {
      systemPrompt += `\n\n- Maintain personal touch in greetings
- Don't convert introductions into questions
- Keep the original intent of self-introduction`;
    }

    return systemPrompt;
  }

  private generateAnswerPrompt(analysis: MessageAnalysis): string {
    let systemPrompt = `Provide a direct, context-appropriate answer to this message.

Context:
- Platform: ${analysis.context.platform || 'unknown'}
- Tone: ${analysis.context.tone || 'professional'}
- Purpose: ${analysis.context.purpose || 'unknown'}
- Confidence: ${analysis.context.confidence || 'unknown'}

Platform Guidelines:
`;

    // Get platform-specific guidelines from the MessagePatternDetector
    const platformGuidelines = this.patternDetector.generatePlatformGuidelines(
      analysis.context.platform as string || 'default',
      analysis.context.tone as string || 'default'
    );

    systemPrompt += platformGuidelines;

    systemPrompt += `

Respond in a manner appropriate to the platform and maintain consistent tone with the original message.`;

    return systemPrompt;
  }
}

export default PromptSystemManager;
