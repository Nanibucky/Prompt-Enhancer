// electron/message-patterns.ts
interface MessagePattern {
  pattern: RegExp;
  platform: 'email' | 'whatsapp' | 'slack' | 'twitter' | 'linkedin' | 'teams' | 'discord' | 'telegram' | 'sms';
  tone: 'formal' | 'informal' | 'professional' | 'friendly' | 'technical' | 'casual' | 'business';
  priority: number;
  indicators: string[];
}

class MessagePatternDetector {
  private patterns: MessagePattern[] = [
    // Email patterns
    {
      pattern: /(?:subject:|re:|fwd:|cc:|bcc:)/i,
      platform: 'email',
      tone: 'formal',
      priority: 10,
      indicators: ['subject', 're', 'fwd', 'cc', 'bcc', 'dear', 'sir', 'madam', 'sincerely', 'regards']
    },
    {
      pattern: /(?:dear|regards|sincerely|best\s+regards|kind\s+regards)/i,
      platform: 'email',
      tone: 'formal',
      priority: 9,
      indicators: []
    },
    // WhatsApp/SMS patterns
    {
      pattern: /^(?:hey|hi|hello|yo|sup|wassup|wazzup)[\s,!]*/i,
      platform: 'whatsapp',
      tone: 'informal',
      priority: 8,
      indicators: ['😂', '😊', '👍', '❤️', 'lol', 'omg', 'btw', 'tmrw', 'asap']
    },
    {
      pattern: /\b(lol|omg|btw|tmrw|asap|gr8|pls|thx)\b/i,
      platform: 'whatsapp',
      tone: 'informal',
      priority: 7,
      indicators: []
    },
    // Slack patterns
    {
      pattern: /@(channel|here|everyone)/i,
      platform: 'slack',
      tone: 'professional',
      priority: 9,
      indicators: ['thread', 'dm', 'channel', 'workspace', 'status:', 'priority:']
    },
    {
      pattern: /\:(\w+)\:/,
      platform: 'slack',
      tone: 'casual',
      priority: 6,
      indicators: []
    },
    // Twitter patterns
    {
      pattern: /#\w+/,
      platform: 'twitter',
      tone: 'casual',
      priority: 8,
      indicators: ['rt', 'dm', 'follow', 'like', 'retweet', '@', '#']
    },
    {
      pattern: /^RT\s|via\s@/i,
      platform: 'twitter',
      tone: 'casual',
      priority: 7,
      indicators: []
    },
    // LinkedIn patterns
    {
      pattern: /(?:connect|network|opportunity|position|role)/i,
      platform: 'linkedin',
      tone: 'professional',
      priority: 8,
      indicators: ['profile', 'experience', 'skills', 'endorsement', 'recommendation']
    },
    // Teams patterns
    {
      pattern: /(?:teams\s+meeting|project\s+update|standup|sprint)/i,
      platform: 'teams',
      tone: 'professional',
      priority: 8,
      indicators: ['meeting', 'presentation', 'deck', 'agenda', 'action items']
    },
    // Discord patterns
    {
      pattern: /(?:server|channel|role|moderator|admin|@everyone|@here)/i,
      platform: 'discord',
      tone: 'casual',
      priority: 7,
      indicators: ['nitro', 'boost', 'reaction', 'thread', 'voice', 'stream']
    },
    // Telegram patterns
    {
      pattern: /(?:\/start|\/help|\/settings|@\w+bot)/i,
      platform: 'telegram',
      tone: 'casual',
      priority: 7,
      indicators: ['bot', 'sticker', 'group', 'channel', 'forward', 'reply']
    }
  ];

  detectPlatform(text: string): { platform: string; tone: string; confidence: number } {
    let topMatch = { platform: 'general', tone: 'professional', confidence: 0 };
    let maxConfidence = 0;

    for (const pattern of this.patterns) {
      let confidence = 0;

      // Check main pattern
      if (pattern.pattern.test(text)) {
        confidence += pattern.priority * 2;
      }

      // Check indicators
      for (const indicator of pattern.indicators) {
        if (text.toLowerCase().includes(indicator.toLowerCase())) {
          confidence += 1;
        }
      }

      // Check for platform-specific length constraints
      if (pattern.platform === 'twitter' && text.length <= 280) {
        confidence += 3;
      } else if (pattern.platform === 'sms' && text.length <= 160) {
        confidence += 3;
      }

      if (confidence > maxConfidence) {
        maxConfidence = confidence;
        topMatch = {
          platform: pattern.platform,
          tone: pattern.tone,
          confidence: confidence
        };
      }
    }

    // If confidence is very low, do additional analysis
    if (maxConfidence < 5) {
      return this.analyzeFallback(text);
    }

    return topMatch;
  }

  private analyzeFallback(text: string): { platform: string; tone: string; confidence: number } {
    // Analyze text characteristics
    const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(text);
    // URL detection (used in platform-specific logic in future updates)
    // const hasUrl = /https?:\/\/[^\s]+/.test(text);
    const isShort = text.length < 150;
    const hasFormalWords = /(?:therefore|however|moreover|regarding|pursuant)/i.test(text);
    const hasInformalWords = /(?:gonna|wanna|gotta|kinda|sorta)/i.test(text);
    const hasTechnicalWords = /(?:api|backend|frontend|database|server|client)/i.test(text);

    let platform = 'general';
    let tone = 'professional';
    let confidence = 3;

    if (hasEmoji && isShort) {
      platform = 'whatsapp';
      tone = 'informal';
      confidence += 2;
    } else if (hasFormalWords && text.length > 200) {
      platform = 'email';
      tone = 'formal';
      confidence += 2;
    } else if (hasTechnicalWords) {
      platform = 'slack';
      tone = 'technical';
      confidence += 2;
    } else if (hasInformalWords && isShort) {
      platform = 'sms';
      tone = 'casual';
      confidence += 2;
    }

    return { platform, tone, confidence };
  }

  generatePlatformGuidelines(platform: string, tone: string): string {
    const guidelines: Record<string, Record<string, string>> = {
      email: {
        formal: `- Use formal salutations and closings (Dear, Sincerely, Regards)
- Maintain professional language throughout
- Structure content with clear paragraphs
- Include subject-appropriate formatting
- Ensure proper grammar and spelling
- Use complete sentences and proper punctuation`,
        professional: `- Balance formality with approachability
- Use appropriate salutations (Hi, Hello)
- Structure content clearly
- Focus on clarity and brevity
- Maintain professional tone without being overly formal`,
        technical: `- Front-load technical details
- Use clear section headers
- Include bullet points for technical specifications
- Define technical terms when necessary
- Provide context for technical decisions`
      },
      whatsapp: {
        informal: `- Keep messages conversational and friendly
- Use appropriate emojis sparingly
- Keep paragraphs short (2-3 lines max)
- Use casual language and contractions
- Mirror the existing tone and emoji usage
- Include reactions/responses to previous messages`,
        casual: `- Keep messages brief and direct
- Use standard abbreviations (e.g., btw, imo)
- Break longer messages into shorter chunks
- Use appropriate emojis to convey emotion
- Keep the tone light and conversational`
      },
      slack: {
        professional: `- Start with the main point
- Use appropriate formatting (bold, italics)
- Include relevant channel mentions if needed
- Break information into digestible points
- Use threads for detailed discussions
- Keep messages focused and action-oriented`,
        technical: `- Lead with technical specifics
- Use code formatting for technical terms
- Include relevant links and documentation
- Provide clear action items
- Use technical language appropriate to the audience`
      },
      twitter: {
        casual: `- Front-load the main message
- Use relevant hashtags sparingly (2-3 max)
- Keep within character limit (280 chars)
- Use abbreviations when needed
- Include call-to-action if appropriate
- Make content engaging and shareable`,
        professional: `- Maintain brand voice
- Use industry-specific hashtags
- Include relevant mentions
- Keep messaging clear and concise
- Balance professionalism with engagement`
      },
      linkedin: {
        professional: `- Use industry-appropriate language
- Structure content for professional context
- Highlight value propositions
- Include relevant hashtags and mentions
- Focus on professional networking etiquette
- Keep tone both professional and engaging`,
        business: `- Focus on business value
- Use data and insights where relevant
- Structure content for easy scanning
- Include clear calls-to-action
- Maintain thought leadership tone`
      },
      default: {
        default: `- Adapt tone to context
- Keep messages clear and purposeful
- Structure content logically
- Use appropriate language for audience
- Ensure message achieves its purpose`
      }
    };

    return guidelines[platform]?.[tone] || guidelines.default.default;
  }
}

export default MessagePatternDetector;
