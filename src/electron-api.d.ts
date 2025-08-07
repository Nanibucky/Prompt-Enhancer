// Import the OpenAIModel type from the openai-service
import { OpenAIModel } from '../electron/openai-service';

interface ElectronAPI {
  getApiKey: () => Promise<string>;
  setApiKey: (apiKey: string) => Promise<boolean>;
  removeApiKey: () => Promise<boolean>;
  getAutoPaste: () => Promise<boolean>;
  toggleAutoPaste: () => Promise<boolean>;

  // Model selection methods
  getSelectedModel: () => Promise<OpenAIModel>;
  setSelectedModel: (modelId: OpenAIModel) => Promise<boolean>;
  getAvailableModels: () => Promise<{id: OpenAIModel; name: string; description: string}[]>;

  // Keyboard shortcut methods
  getKeyboardShortcut: () => Promise<string>;
  setKeyboardShortcut: (shortcut: string) => Promise<boolean>;
  resetKeyboardShortcut: () => Promise<string>;

  // Enhancement popup methods
  getOriginalText: () => Promise<string>;
  requestEnhancement: (promptType: string, modelId?: string, noCache?: boolean) => void;
  confirmEnhancement: (text: string) => void;
  onOriginalText: (callback: (text: string) => void) => () => void;
  onEnhancementResult: (callback: (text: string) => void) => () => void;
  onEnhancementError: (callback: (error: string) => void) => () => void;

  // Navigation events
  onNavigateToLogin: (callback: () => void) => () => void;

  // Clipboard operations
  refreshClipboardText: () => void;
}

declare interface Window {
  api: ElectronAPI;
}
