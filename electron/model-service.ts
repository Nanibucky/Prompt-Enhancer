// electron/model-service.ts
import { OpenAIModel, openai } from './openai-service.js';
import { GeminiModel, gemini } from './gemini-service.js';

// Define the provider type
export type ModelProvider = 'openai' | 'gemini';

// Define a union type for all supported models
export type SupportedModel = OpenAIModel | GeminiModel;

// Interface for model information
export interface ModelInfo {
  id: SupportedModel;
  name: string;
  description: string;
  provider: ModelProvider;
}

class ModelService {
  // Get all available models from all providers
  getAllAvailableModels(): ModelInfo[] {
    const openaiModels = openai.getAvailableModels().map(model => ({
      ...model,
      provider: 'openai' as ModelProvider
    }));

    const geminiModels = gemini.getAvailableModels().map(model => ({
      ...model,
      provider: 'gemini' as ModelProvider
    }));

    return [...openaiModels, ...geminiModels];
  }

  // Get models for a specific provider
  getModelsForProvider(provider: ModelProvider): ModelInfo[] {
    if (provider === 'openai') {
      return openai.getAvailableModels().map(model => ({
        ...model,
        provider: 'openai' as ModelProvider
      }));
    } else {
      return gemini.getAvailableModels().map(model => ({
        ...model,
        provider: 'gemini' as ModelProvider
      }));
    }
  }

  // Get default model for a provider
  getDefaultModelForProvider(provider: ModelProvider): SupportedModel {
    if (provider === 'openai') {
      return 'gpt-4o-mini';
    } else {
      return 'gemini-1.5-pro-latest';
    }
  }

  // Enhance prompt using the appropriate service based on the model
  async enhancePrompt(
    originalText: string,
    systemPrompt: string,
    apiKey: string,
    model: SupportedModel,
    provider: ModelProvider,
    noCache: boolean = false
  ): Promise<string> {
    if (provider === 'openai') {
      return openai.enhancePrompt(
        originalText,
        systemPrompt,
        apiKey,
        model as OpenAIModel,
        noCache
      );
    } else {
      return gemini.enhancePrompt(
        originalText,
        systemPrompt,
        apiKey,
        model as GeminiModel,
        noCache
      );
    }
  }

  // Check if a model belongs to a specific provider
  isModelFromProvider(model: SupportedModel, provider: ModelProvider): boolean {
    if (provider === 'openai') {
      return ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4o-mini'].includes(model);
    } else {
      return ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro-latest', 'gemini-ultra'].includes(model);
    }
  }
}

export const modelService = new ModelService();
