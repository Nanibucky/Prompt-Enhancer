import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePrompts } from './PromptContext';
import { useToast } from '@/components/ui/use-toast';

interface EnhancementContextType {
  originalText: string;
  enhancedText: string | null;
  isLoading: boolean;
  selectedModel: string;
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

  const { addToHistory } = usePrompts();
  const { toast } = useToast();

  useEffect(() => {
    // Check if window.api is available
    if (typeof window === 'undefined' || !window.api) {
      console.warn('Electron API not available, skipping API setup');
      return;
    }

    // Load selected model
    const loadModelSettings = async () => {
      try {
        const model = await window.api.getSelectedModel();
        setSelectedModel(model);
      } catch (error) {
        console.error('Failed to load model settings:', error);
        // Fallback to default model if API fails
        setSelectedModel('gpt-4o-mini');
      }
    };

    loadModelSettings();

    // Listen for original text from main process
    const removeListener = window.api.onOriginalText((text) => {
      if (typeof text === 'string' && text.trim().length > 0) {
        setOriginalText(text);
      } else {
        console.warn('Received invalid original text:', text);
      }
    });

    // Listen for enhancement result
    const removeResultListener = window.api.onEnhancementResult((text) => {
      if (typeof text === 'string' && text.trim().length > 0) {
        setEnhancedText(text);
        setIsLoading(false);

        // Save to history when we get a result
        try {
          // Validate prompt type before saving
          const validPromptTypes: Array<'agent' | 'general' | 'answer'> = ['agent', 'general', 'answer'];
          const promptType = validPromptTypes.includes(currentPromptType as any) 
            ? currentPromptType as 'agent' | 'general' | 'answer'
            : 'general';

          addToHistory({
            text,
            type: promptType,
            title: generateTitle(text, promptType),
            isFavorite: false
          });
        } catch (historyError) {
          console.error('Failed to save to history:', historyError);
        }
      } else {
        console.error('Received invalid enhancement result:', text);
        setIsLoading(false);
        toast({
          title: 'Enhancement Failed',
          description: 'Received invalid enhancement result',
          variant: 'destructive',
        });
      }
    });

    // Listen for enhancement error
    const removeErrorListener = window.api.onEnhancementError((error) => {
      console.error('Enhancement error received:', error);
      toast({
        title: 'Enhancement Failed',
        description: typeof error === 'string' ? error : 'An unknown error occurred',
        variant: 'destructive',
      });
      setIsLoading(false);
    });

    return () => {
      try {
        removeListener();
        removeResultListener();
        removeErrorListener();
      } catch (error) {
        console.error('Error cleaning up listeners:', error);
      }
    };
  }, [toast, addToHistory, currentPromptType]);

  const generateTitle = (text: string, promptType: string): string => {
    // Generate a title based on the first few words of the text
    const words = text.split(' ').slice(0, 5).join(' ');
    return `${promptType.charAt(0).toUpperCase() + promptType.slice(1)}: ${words}${words.length < text.length ? '...' : ''}`;
  };

  const handleRegenerate = (promptTypeWithParams: string) => {
    console.log('handleRegenerate called with promptTypeWithParams:', promptTypeWithParams);

    // Check if window.api is available
    if (typeof window === 'undefined' || !window.api) {
      console.error('Electron API not available');
      toast({
        title: 'Enhancement Failed',
        description: 'Desktop API not available. Please run in Electron app.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      // Clear the previous enhanced text to show that we're generating a new response
      setEnhancedText(null);

      // Extract the base prompt type and any parameters
      let promptType = promptTypeWithParams || 'general';
      let noCache = false;

      // Check if there are parameters in the promptType
      if (promptTypeWithParams && promptTypeWithParams.includes('?')) {
        const [baseType, params] = promptTypeWithParams.split('?');
        promptType = baseType || 'general';

        // Check for nocache parameter
        if (params && params.includes('nocache=')) {
          noCache = true;
          console.log('No cache parameter detected, forcing regeneration');
        }
      }

      // Make sure we're using the correct prompt type
      const validPromptTypes = ['agent', 'general', 'answer'];
      if (!promptType || !validPromptTypes.includes(promptType)) {
        console.warn('Invalid prompt type:', promptType, 'defaulting to general');
        promptType = 'general'; // Default to general if invalid
      }

      // Store the current prompt type for history saving
      setCurrentPromptType(promptType);

      console.log('Sending request to enhance with promptType:', promptType, 'noCache:', noCache);

      // Validate selectedModel before sending
      if (!selectedModel || typeof selectedModel !== 'string') {
        console.warn('Invalid selected model:', selectedModel, 'using default');
        setSelectedModel('gpt-4o-mini');
      }

      // Handle different modes according to the requirements:
      // - General mode: Enhance the prompt (default behavior)
      // - Answer mode: Provide a direct answer to the question in the clipboard
      // - Agent mode: Follow agent instructions to provide an effective answer

      // The backend already handles these different modes with appropriate system prompts
      // This ensures the response changes based on the selected button
      window.api.requestEnhancement(promptType, selectedModel || 'gpt-4o-mini', noCache);
    } catch (error) {
      console.error('Error in handleRegenerate:', error);
      setIsLoading(false);
      toast({
        title: 'Enhancement Failed',
        description: 'An error occurred while starting enhancement',
        variant: 'destructive',
      });
    }
  };

  const handleConfirm = (text: string) => {
    try {
      // Validate input
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        console.error('Invalid text for confirmation:', text);
        toast({
          title: 'Confirmation Failed',
          description: 'No text to confirm',
          variant: 'destructive',
        });
        return;
      }

      // Check if window.api is available
      if (typeof window === 'undefined' || !window.api) {
        console.warn('Electron API not available, falling back to clipboard copy');
        // Fallback to clipboard copy only
        navigator.clipboard.writeText(text).then(() => {
          toast({
            title: 'Text Copied',
            description: 'Text copied to clipboard (desktop features not available)',
            variant: 'default',
          });
        }).catch((error) => {
          console.error('Failed to copy to clipboard:', error);
          toast({
            title: 'Copy Failed',
            description: 'Failed to copy text to clipboard',
            variant: 'destructive',
          });
        });
        return;
      }

      // First, copy the text to clipboard
      navigator.clipboard.writeText(text).then(() => {
        console.log('Text copied to clipboard in renderer process');

        // Then send the confirmation to the main process for auto-paste
        // The main process will handle closing the window after the paste attempt
        window.api.confirmEnhancement(text);

        // Don't close the window here - the main process will handle it
        // This allows the main process to hide the window first, then paste, then close
      }).catch((clipboardError) => {
        console.error('Failed to copy to clipboard:', clipboardError);
        toast({
          title: 'Copy Failed',
          description: 'Failed to copy text to clipboard',
          variant: 'destructive',
        });
      });
    } catch (error) {
      console.error('Error in handleConfirm:', error);
      toast({
        title: 'Confirmation Failed',
        description: 'An error occurred during confirmation',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    try {
      if (typeof window !== 'undefined' && window.close) {
        window.close();
      } else {
        console.warn('Window close not available');
      }
    } catch (error) {
      console.error('Error closing window:', error);
    }
  };

  const handleRefreshText = () => {
    try {
      // Check if window.api is available
      if (typeof window === 'undefined' || !window.api) {
        console.warn('Electron API not available, cannot refresh text from main process');
        toast({
          title: 'Refresh Failed',
          description: 'Desktop API not available',
          variant: 'destructive',
        });
        return;
      }

      // Request the latest clipboard content from the main process
      window.api.refreshClipboardText();

      // Listen for the refreshed text
      const refreshListener = window.api.onOriginalText((text) => {
        try {
          // Always update the original text with the clipboard content
          console.log('Refreshed text from clipboard:', text);
          if (typeof text === 'string') {
            setOriginalText(text);
          } else {
            console.warn('Received invalid text from refresh:', text);
            setOriginalText('');
          }
          // Remove this listener after receiving the text
          refreshListener();
        } catch (error) {
          console.error('Error processing refreshed text:', error);
          refreshListener();
        }
      });
    } catch (error) {
      console.error('Error in handleRefreshText:', error);
      toast({
        title: 'Refresh Failed',
        description: 'An error occurred while refreshing text',
        variant: 'destructive',
      });
    }
  };

  return (
    <EnhancementContext.Provider value={{
      originalText,
      enhancedText,
      isLoading,
      selectedModel,
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
