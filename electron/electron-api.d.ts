// electron/electron-api.d.ts
import { OpenAIModel } from './openai-service.js';
import { GeminiModel } from './gemini-service.js';
import { ModelProvider, SupportedModel, ModelInfo } from './model-service.js';

interface ElectronAPI {
    // Legacy API key methods (for backward compatibility)
    getApiKey: () => Promise<string>;
    setApiKey: (apiKey: string) => Promise<boolean>;
    removeApiKey: () => Promise<boolean>;

    // Provider-specific API key methods
    getOpenAIApiKey: () => Promise<string>;
    setOpenAIApiKey: (apiKey: string) => Promise<boolean>;
    removeOpenAIApiKey: () => Promise<boolean>;
    getGeminiApiKey: () => Promise<string>;
    setGeminiApiKey: (apiKey: string) => Promise<boolean>;
    removeGeminiApiKey: () => Promise<boolean>;

    // Settings
    getAutoPaste: () => Promise<boolean>;
    toggleAutoPaste: () => Promise<boolean>;

    // Provider selection methods
    getSelectedProvider: () => Promise<ModelProvider>;
    setSelectedProvider: (provider: ModelProvider) => Promise<boolean>;

    // Model selection methods
    getSelectedModel: () => Promise<SupportedModel>;
    setSelectedModel: (modelId: SupportedModel) => Promise<boolean>;
    getAvailableModels: () => Promise<ModelInfo[]>;
    getModelsForProvider: (provider: ModelProvider) => Promise<ModelInfo[]>;

    // Keyboard shortcut methods
    getKeyboardShortcut: () => Promise<string>;
    setKeyboardShortcut: (shortcut: string) => Promise<boolean>;
    resetKeyboardShortcut: () => Promise<string>;

    // Enhancement popup methods
    getOriginalText: () => Promise<string>;
    refreshClipboardText: () => void;
    requestEnhancement: (promptType: string, modelId?: string) => void;
    confirmEnhancement: (text: string) => void;
    onOriginalText: (callback: (text: string) => void) => () => void;
    onEnhancementResult: (callback: (text: string) => void) => () => void;
    onEnhancementError: (callback: (error: string) => void) => () => void;
    
    // Navigation events
    onNavigateToLogin: (callback: () => void) => () => void;
    onNavigateToSetup: (callback: () => void) => () => void;
  }

  declare interface Window {
    api: ElectronAPI;
  }