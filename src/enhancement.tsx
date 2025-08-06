// src/enhancement.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import EnhancementPopup from './components/EnhancementPopup';
import { Toaster } from './components/ui/toaster';
import { PromptProvider } from './contexts/PromptContext';
import { EnhancementProvider } from './contexts/EnhancementContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useEnhancement } from './contexts/EnhancementContext';

const Enhancement = () => {
  return (
    <ThemeProvider>
      <PromptProvider>
        <EnhancementProvider>
          <EnhancementContent />
        </EnhancementProvider>
      </PromptProvider>
    </ThemeProvider>
  );
};

const EnhancementContent = () => {
  const {
    originalText,
    enhancedText,
    isLoading,
    instructions,
    setInstructions,
    handleClose,
    handleConfirm,
    handleRegenerate,
    handleRefreshText
  } = useEnhancement();

  return (
    <>
      <EnhancementPopup
        originalText={originalText}
        enhancedText={enhancedText}
        isLoading={isLoading}
        instructions={instructions}
        onInstructionsChange={setInstructions}
        onClose={handleClose}
        onConfirm={handleConfirm}
        onRegenerate={handleRegenerate}
        onRefreshText={handleRefreshText}
      />
      <Toaster />
    </>
  );
};

createRoot(document.getElementById('enhancement-root')!).render(<Enhancement />);