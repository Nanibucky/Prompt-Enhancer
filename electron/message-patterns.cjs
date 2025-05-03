// electron/message-patterns.cjs
// A simplified CommonJS version of the message-patterns.ts file

class MessagePatternDetector {
  constructor() {
    this.platformPatterns = {
      slack: {
        patterns: [
          /@channel/, /@here/, /@everyone/,
          /\*\*.*?\*\*/, /\*.*?\*/, /_.*?_/,
          /```.*?```/s
        ],
        keywords: ['slack', 'channel', 'thread', 'dm', 'direct message']
      },
      twitter: {
        patterns: [
          /@\w+/, /#\w+/,
          /^RT @\w+:/, /\(via @\w+\)/
        ],
        keywords: ['tweet', 'twitter', 'retweet', 'hashtag', 'trending']
      },
      whatsapp: {
        patterns: [
          /😀|😃|😄|😁|😆|😅|😂|🤣|😊|😇|🙂|🙃|😉|😌|😍|🥰|😘|😗|😙|😚|😋|😛|😝|😜|🤪|🤨|🧐|🤓|😎|🤩|🥳|😏|😒|😞|😔|😟|😕|🙁|☹️|😣|😖|😫|😩|🥺|😢|😭|😤|😠|😡|🤬|🤯|😳|🥵|🥶|😱|😨|😰|😥|😓|🤗|🤔|🤭|🤫|🤥|😶|😐|😑|😬|🙄|😯|😦|😧|😮|😲|🥱|😴|🤤|😪|😵|🤐|🥴|🤢|🤮|🤧|😷|🤒|🤕|🤑|🤠/,
          /\*[^*]+\*/
        ],
        keywords: ['whatsapp', 'message', 'chat', 'group', 'status']
      },
      email: {
        patterns: [
          /^Subject:\s+/i, /^From:\s+/i, /^To:\s+/i, /^Cc:\s+/i, /^Bcc:\s+/i,
          /^Dear\s+[A-Z][a-z]+,/i,
          /\n\s*Best regards,\s*\n/i, /\n\s*Sincerely,\s*\n/i, /\n\s*Regards,\s*\n/i,
          /^On .* wrote:/
        ],
        keywords: ['email client', 'outlook', 'gmail', 'mail server', 'email address']
      },
      linkedin: {
        patterns: [
          /^I am writing to inquire about/i, /^I noticed your profile/i,
          /^I would like to connect/i, /^I am reaching out/i,
          /^Looking for opportunities/i, /^Open to work/i
        ],
        keywords: ['linkedin', 'connection', 'network', 'job', 'opportunity', 'profile', 'experience', 'skills']
      },
      github: {
        patterns: [
          /fixes #\d+/i, /closes #\d+/i, /resolves #\d+/i,
          /PR/, /pull request/, /issue #\d+/,
          /```[a-z]*\n[\s\S]*?\n```/
        ],
        keywords: ['github', 'repo', 'repository', 'commit', 'branch', 'merge', 'pull request', 'issue', 'bug', 'feature']
      },
      discord: {
        patterns: [
          /@everyone/, /@here/, /<@\d+>/,
          /<#\d+>/, /<@&\d+>/,
          /```.*?```/s
        ],
        keywords: ['discord', 'server', 'channel', 'dm', 'ping', 'role', 'mention']
      }
    };

    this.tonePatterns = {
      formal: {
        patterns: [
          /I am writing to/, /I would like to/, /I am pleased to/,
          /Please find/, /I look forward to/, /Thank you for your consideration/,
          /Sincerely,/, /Regards,/, /Best regards,/
        ],
        keywords: ['formal', 'professional', 'official', 'business', 'corporate']
      },
      casual: {
        patterns: [
          /Hey!/, /Hi there!/, /What's up/, /How's it going/,
          /Thanks!/, /Cheers!/, /Later!/,
          /btw/, /lol/, /haha/, /cool/, /awesome/, /nice/
        ],
        keywords: ['casual', 'informal', 'friendly', 'relaxed', 'chill']
      },
      urgent: {
        patterns: [
          /URGENT/, /ASAP/, /as soon as possible/, /immediately/,
          /emergency/, /critical/, /deadline/, /time-sensitive/,
          /!{2,}/
        ],
        keywords: ['urgent', 'important', 'critical', 'emergency', 'deadline', 'asap']
      },
      technical: {
        patterns: [
          /```[a-z]*\n[\s\S]*?\n```/,
          /function\s+\w+\s*\(/, /class\s+\w+/, /const\s+\w+\s*=/,
          /var\s+\w+\s*=/, /let\s+\w+\s*=/, /import\s+.*from/,
          /export\s+/, /interface\s+\w+/, /type\s+\w+\s*=/
        ],
        keywords: ['code', 'function', 'class', 'method', 'variable', 'implementation', 'algorithm', 'debug']
      }
    };
  }

  // Detect the platform based on message content
  detectPlatform(text) {
    // Default to general platform with neutral tone
    let bestMatch = { platform: 'general', confidence: 0, tone: 'neutral', format: 'text' };

    // Set a higher threshold for email detection to avoid false positives
    const EMAIL_CONFIDENCE_THRESHOLD = 4;

    // Check for specific format patterns first
    // Email format - must have multiple email-specific headers or clear email structure
    const emailHeadersRegex = /^(From|To|Subject|Date|Cc|Bcc):\s*.*\n/m;
    const emailSignatureRegex = /\n--\s*\n|\nRegards,|\nSincerely,|\nBest,|\nThank you,/m;
    const emailAddressRegex = /[\w.\-]+@[\w\-]+\.[\w.\-]+/;

    // Code format - must have code blocks or multiple programming keywords
    const codeBlockRegex = /```[\w]*\n[\s\S]*?\n```|`[^`]+`/;
    const codingKeywordsRegex = /\b(function|class|const|let|var|import|export|if|else|for|while|return|try|catch)\b/g;

    // List formats
    const bulletListRegex = /^\s*[-*•]\s+.+$(\n\s*[-*•]\s+.+$)+/m;
    const numberedListRegex = /^\s*\d+\.\s+.+$(\n\s*\d+\.\s+.+$)+/m;

    // Table and JSON formats
    const tableRegex = /\|[^\|]+\|[^\|]+\|/;
    const jsonRegex = /\{[\s\S]*"[\w]+"\s*:\s*[\s\S]*\}/;

    // Chat/message formats
    const chatFormatRegex = /^\s*[\w\s]+:\s*.+$(\n\s*[\w\s]+:\s*.+$)+/m; // Person: Message format
    const messageThreadRegex = /^\s*>\s*.+$(\n\s*>\s*.+$)*/m; // Quoted message format

    // Detect format
    // Email - must meet multiple criteria to be considered an email
    let emailScore = 0;
    if (emailHeadersRegex.test(text)) emailScore += 3;
    if (emailSignatureRegex.test(text)) emailScore += 2;
    if (emailAddressRegex.test(text)) emailScore += 1;
    if (text.includes('Dear') && (text.includes('Regards') || text.includes('Sincerely'))) emailScore += 2;

    if (emailScore >= 3) {
      bestMatch.format = 'email';
      bestMatch.platform = 'email';
      bestMatch.confidence += emailScore;
    }
    // Code - check for code blocks or multiple programming keywords
    else if (codeBlockRegex.test(text)) {
      bestMatch.format = 'code';
      bestMatch.confidence += 3;
    }
    else {
      const codingKeywordsMatches = text.match(codingKeywordsRegex);
      if (codingKeywordsMatches && codingKeywordsMatches.length >= 3) {
        bestMatch.format = 'code';
        bestMatch.confidence += 2;
      }
      // Lists
      else if (bulletListRegex.test(text) || numberedListRegex.test(text)) {
        bestMatch.format = 'list';
        bestMatch.confidence += 2;
      }
      // Table
      else if (tableRegex.test(text)) {
        bestMatch.format = 'table';
        bestMatch.confidence += 2;
      }
      // JSON
      else if (jsonRegex.test(text)) {
        bestMatch.format = 'json';
        bestMatch.confidence += 3;
      }
      // Chat/message format
      else if (chatFormatRegex.test(text)) {
        bestMatch.format = 'chat';
        bestMatch.confidence += 2;
      }
      // Message thread with quotes
      else if (messageThreadRegex.test(text)) {
        bestMatch.format = 'thread';
        bestMatch.confidence += 2;
      }
      // Default to 'message' format for short texts that don't match other formats
      else if (text.length < 500) {
        bestMatch.format = 'message';
      }
    }

    // Check each platform's patterns and keywords
    for (const [platform, data] of Object.entries(this.platformPatterns)) {
      let confidence = 0;

      // Check patterns
      for (const pattern of data.patterns) {
        if (pattern.test(text)) {
          confidence += 2;
        }
      }

      // Check keywords
      for (const keyword of data.keywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          confidence += 1;
        }
      }

      // Special case for email - require higher confidence
      if (platform === 'email' && confidence < EMAIL_CONFIDENCE_THRESHOLD && bestMatch.format !== 'email') {
        // Reset confidence for email if it doesn't meet the threshold
        confidence = 0;
      }

      // Update best match if this platform has higher confidence
      if (confidence > bestMatch.confidence) {
        bestMatch.platform = platform;
        bestMatch.confidence = confidence;
      }
    }

    // Detect tone
    bestMatch.tone = this.detectTone(text);

    console.log('Detected format:', bestMatch.format);
    return bestMatch;
  }

  // Detect the tone of the message
  detectTone(text) {
    let bestMatch = { tone: 'neutral', confidence: 0 };

    // Check each tone's patterns and keywords
    for (const [tone, data] of Object.entries(this.tonePatterns)) {
      let confidence = 0;

      // Check patterns
      for (const pattern of data.patterns) {
        if (pattern.test(text)) {
          confidence += 2;
        }
      }

      // Check keywords
      for (const keyword of data.keywords) {
        if (text.toLowerCase().includes(keyword.toLowerCase())) {
          confidence += 1;
        }
      }

      // Update best match if this tone has higher confidence
      if (confidence > bestMatch.confidence) {
        bestMatch.tone = tone;
        bestMatch.confidence = confidence;
      }
    }

    return bestMatch.tone;
  }

  // Generate platform-specific guidelines
  generatePlatformGuidelines(platform, tone, format = 'text') {
    // Format-specific guidelines take precedence
    const formatGuidelines = {
      email: "Maintain email format with proper headers, greeting, body, and signature. Preserve paragraph structure. Keep professional tone if appropriate.",
      code: "Preserve code blocks and syntax. Maintain indentation and formatting. Don't remove technical details or variable names.",
      list: "Maintain list structure (bullet points or numbering). Preserve hierarchy and indentation. Keep consistent formatting across list items.",
      table: "Preserve table structure and alignment. Maintain column headers if present. Keep data organized in rows and columns.",
      json: "Preserve JSON structure and syntax. Maintain key-value pairs. Don't remove or reformat valid JSON.",
      chat: "Maintain the chat format with speaker names and colons. Preserve the conversation flow and speaker turns. Keep the informal tone if present.",
      thread: "Preserve quoted message format with '>' characters. Maintain the distinction between quoted text and responses. Keep the conversation context intact.",
      message: "Enhance the message while maintaining its original structure and flow. Don't add unnecessary formality or convert to email format unless appropriate."
    };

    const guidelines = {
      slack: {
        formal: "Use proper Slack formatting. Avoid excessive emojis. Use code blocks for code. Be concise but thorough.",
        casual: "Use Slack-friendly formatting. Feel free to use emojis where appropriate. Keep it conversational.",
        urgent: "Use @channel or @here appropriately. Clearly mark urgent items. Be direct and specific.",
        technical: "Use code blocks with language specification. Format technical terms properly. Be precise."
      },
      twitter: {
        formal: "Keep within character limits. Avoid hashtags in formal communications. Be concise and professional.",
        casual: "Use relevant hashtags. Keep it brief and engaging. Consider adding emojis for emphasis.",
        urgent: "Start with URGENT if truly time-sensitive. Use clear, direct language. Avoid unnecessary hashtags.",
        technical: "Use technical terms precisely. Link to more details if needed. Avoid jargon unless necessary."
      },
      whatsapp: {
        formal: "Use proper paragraphs. Avoid excessive emojis. Use formatting sparingly for emphasis.",
        casual: "Keep it conversational. Emojis are welcome. Use short paragraphs for readability.",
        urgent: "Mark urgent messages clearly. Be direct. Follow up with details in separate messages.",
        technical: "Use formatting for code snippets. Break down complex concepts. Use lists for steps."
      },
      email: {
        formal: "Use proper salutation and closing. Maintain professional language. Structure with clear paragraphs.",
        casual: "Keep a friendly tone but maintain clarity. Use appropriate greeting and sign-off.",
        urgent: "Mark urgent in subject line. Start with the key request. Be specific about deadlines.",
        technical: "Use proper formatting for technical content. Consider attachments for code or diagrams."
      },
      linkedin: {
        formal: "Maintain professional language. Reference specific aspects of profile or experience. Be concise.",
        casual: "Keep professional but conversational. Personalize the message. Show genuine interest.",
        urgent: "Explain why the matter is time-sensitive. Be respectful of the professional context.",
        technical: "Reference specific technical skills or projects. Be precise with technical terminology."
      },
      github: {
        formal: "Use proper issue/PR formatting. Reference relevant issues. Be specific about changes.",
        casual: "Maintain clarity while being conversational. Use proper markdown formatting.",
        urgent: "Clearly explain the urgency. Tag relevant maintainers. Provide all necessary context.",
        technical: "Use code blocks with language specification. Be precise about technical details."
      },
      discord: {
        formal: "Use proper channel etiquette. Avoid excessive mentions. Structure your message clearly.",
        casual: "Feel free to use emojis and GIFs. Tag relevant roles when appropriate. Keep it friendly.",
        urgent: "Use @here or @everyone only when truly necessary. Clearly state the urgent matter.",
        technical: "Use code blocks with syntax highlighting. Format commands properly. Be specific."
      },
      general: {
        formal: "Maintain professional language and structure. Be clear and concise. Use appropriate greetings.",
        casual: "Keep a conversational tone. Use natural language. Feel free to use appropriate emojis.",
        urgent: "Clearly state the urgency and deadlines. Be direct about what's needed and when.",
        technical: "Use proper formatting for technical content. Be precise with terminology. Structure logically."
      }
    };

    // Check if we have format-specific guidelines first
    if (format !== 'text' && formatGuidelines[format]) {
      // If we have a specific format, combine format guidelines with platform/tone guidelines
      const platformGuide = guidelines[platform] || guidelines.general;
      const toneGuide = platformGuide[tone] || platformGuide.formal;

      return formatGuidelines[format] + "\n\n" + toneGuide;
    }

    // Default to general if platform not found
    const platformGuide = guidelines[platform] || guidelines.general;

    // Default to neutral tone if tone not found
    return platformGuide[tone] || platformGuide.formal;
  }
}

module.exports = MessagePatternDetector;
