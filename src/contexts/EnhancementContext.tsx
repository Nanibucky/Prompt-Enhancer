import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePrompts } from './PromptContext';
import { useToast } from '@/components/ui/use-toast';

interface EnhancementContextType {
  originalText: string;
  enhancedText: string | null;
  isLoading: boolean;
  selectedModel: string;
  instructions: string;
  setInstructions: (instructions: string) => void;
  handleRegenerate: (promptType: string) => void;
  handleConfirm: (text: string) => void;
  handleClose: () => void;
  handleRefreshText: () => void;
}

const EnhancementContext = createContext<EnhancementContextType | undefined>(undefined);

export function EnhancementProvider({ children }: { children: React.ReactNode }) {
  const [originalText, setOriginalText] = useState<string>('');
  const [enhancedText, setEnhancedText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>('gpt-3.5-turbo');
  const [currentPromptType, setCurrentPromptType] = useState<string>('general');
  const [instructions, setInstructionsState] = useState<string>('');

  const { addToHistory } = usePrompts();
  const { toast } = useToast();

  // Load and save instructions from electron store
  useEffect(() => {
    const loadInstructions = async () => {
      try {
        const savedInstructions = await window.api.getLastInstructions();
        setInstructionsState(savedInstructions || '');
      } catch (error) {
        console.error('Failed to load instructions:', error);
        // Fallback to localStorage for web mode
        const savedInstructions = localStorage.getItem('last-instructions') || '';
        setInstructionsState(savedInstructions);
      }
    };
    loadInstructions();
  }, []);

  const setInstructions = async (newInstructions: string) => {
    setInstructionsState(newInstructions);
    try {
      await window.api.setLastInstructions(newInstructions);
    } catch (error) {
      console.error('Failed to save instructions:', error);
      // Fallback to localStorage for web mode
      localStorage.setItem('last-instructions', newInstructions);
    }
  };

  useEffect(() => {
    // Load selected model
    const loadModelSettings = async () => {
      try {
        const model = await window.api.getSelectedModel();
        setSelectedModel(model);
      } catch (error) {
        console.error('Failed to load model settings:', error);
      }
    };

    loadModelSettings();

    // Listen for original text from main process
    const removeListener = window.api.onOriginalText((text) => {
      setOriginalText(text);
    });

    // Listen for enhancement result
    const removeResultListener = window.api.onEnhancementResult((text) => {
      setEnhancedText(text);
      setIsLoading(false);

      // Save to history when we get a result
      if (text) {
        addToHistory({
          text,
          type: currentPromptType as 'agent' | 'general' | 'answer',
          title: generateTitle(text, currentPromptType),
          isFavorite: false
        });
      }
    });

    // Listen for enhancement error
    const removeErrorListener = window.api.onEnhancementError((error) => {
      toast({
        title: 'Enhancement Failed',
        description: error,
        variant: 'destructive',
      });
      setIsLoading(false);
    });

    return () => {
      removeListener();
      removeResultListener();
      removeErrorListener();
    };
  }, [toast, addToHistory, currentPromptType]);

  const generateTitle = (text: string, promptType: string): string => {
    // Generate a title based on the first few words of the text
    const words = text.split(' ').slice(0, 5).join(' ');
    return `${promptType.charAt(0).toUpperCase() + promptType.slice(1)}: ${words}${words.length < text.length ? '...' : ''}`;
  };

  const handleRegenerate = (promptTypeWithParams: string) => {
    console.log('handleRegenerate called with promptTypeWithParams:', promptTypeWithParams);
    setIsLoading(true);
    // Clear the previous enhanced text to show that we're generating a new response
    setEnhancedText(null);

    // Extract the base prompt type and any parameters
    let promptType = promptTypeWithParams;
    let noCache = false;

    // Check if there are parameters in the promptType
    if (promptTypeWithParams.includes('?')) {
      const [baseType, params] = promptTypeWithParams.split('?');
      promptType = baseType;

      // Check for nocache parameter
      if (params.includes('nocache=')) {
        noCache = true;
        console.log('No cache parameter detected, forcing regeneration');
      }
    }

    // Make sure we're using the correct prompt type
    const validPromptTypes = ['agent', 'general', 'answer'];
    if (!validPromptTypes.includes(promptType)) {
      console.error('Invalid prompt type:', promptType);
      promptType = 'general'; // Default to general if invalid
    }

    // Store the current prompt type for history saving
    setCurrentPromptType(promptType);

    console.log('Sending request to enhance with promptType:', promptType, 'noCache:', noCache);

    // Handle different modes according to the requirements:
    // - General mode: Enhance the prompt (default behavior)
    // - Answer mode: Provide a direct answer to the question in the clipboard
    // - Agent mode: Follow agent instructions to provide an effective answer

    // The backend already handles these different modes with appropriate system prompts
    // This ensures the response changes based on the selected button
    window.api.requestEnhancement(promptType, selectedModel, noCache, instructions);
  };

  const handleConfirm = (text: string) => {
    // First, copy the text to clipboard
    navigator.clipboard.writeText(text);
    console.log('Text copied to clipboard in renderer process');

    // Then send the confirmation to the main process for auto-paste
    // The main process will handle closing the window after the paste attempt
    window.api.confirmEnhancement(text);

    // Don't close the window here - the main process will handle it
    // This allows the main process to hide the window first, then paste, then close
    // window.close();
  };

  const handleClose = () => {
    window.close();
  };

  const handleRefreshText = () => {
    // Request the latest clipboard content from the main process
    window.api.refreshClipboardText();

    // Listen for the refreshed text
    const refreshListener = window.api.onOriginalText((text) => {
      // Always update the original text with the clipboard content
      console.log('Refreshed text from clipboard:', text);
      setOriginalText(text);
      // Remove this listener after receiving the text
      refreshListener();
    });
  };

  return (
    <EnhancementContext.Provider value={{
      originalText,
      enhancedText,
      isLoading,
      selectedModel,
      instructions,
      setInstructions,
      handleRegenerate,
      handleConfirm,
      handleClose,
      handleRefreshText
    }}>
      {children}
    </EnhancementContext.Provider>
  );
}

export function useEnhancement() {
  const context = useContext(EnhancementContext);
  if (context === undefined) {
    throw new Error('useEnhancement must be used within an EnhancementProvider');
  }
  return context;
}
