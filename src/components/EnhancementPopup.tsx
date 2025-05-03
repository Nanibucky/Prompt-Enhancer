// src/components/EnhancementPopup.tsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import GlowingTabs from "@/components/GlowingTabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PromptHistory from "@/components/PromptHistory";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Copy, Check, Wand2, RefreshCw, History } from "lucide-react";

interface EnhancementPopupProps {
  originalText: string;
  enhancedText: string | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (text: string) => void;
  onRegenerate: (promptType: string) => void;
  onRefreshText: () => void;
}

const EnhancementPopup: React.FC<EnhancementPopupProps> = ({
  originalText,
  enhancedText,
  isLoading,
  onClose,
  onConfirm,
  onRegenerate,
  onRefreshText
}) => {
  // Initialize with the saved prompt type from localStorage or default to 'general'
  const savedType = localStorage.getItem('selectedPromptType');
  const initialType = savedType && ['agent', 'general', 'answer'].includes(savedType) ? savedType : 'general';

  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [copied, setCopied] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);

  // Debug log to track selectedType changes
  useEffect(() => {
    console.log('Selected type changed to:', selectedType);

    // Validate the selectedType to ensure it's one of the expected values
    if (!['agent', 'general', 'answer'].includes(selectedType)) {
      console.error('Invalid selectedType:', selectedType);
      setSelectedType('general'); // Reset to general if invalid
    }

    // Store the selected type in localStorage for persistence
    localStorage.setItem('selectedPromptType', selectedType);
  }, [selectedType]);

  // Load the previously selected type on mount
  useEffect(() => {
    const savedType = localStorage.getItem('selectedPromptType');
    if (savedType && ['agent', 'general', 'answer'].includes(savedType)) {
      console.log('Loading saved prompt type from localStorage:', savedType);
      setSelectedType(savedType);
    }
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleCopy = () => {
    if (!enhancedText) return;

    navigator.clipboard.writeText(enhancedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTabChange = (tab: string) => {
    console.log('Tab changed to:', tab);
    // Validate the tab value
    if (!['agent', 'general', 'answer'].includes(tab)) {
      console.error('Invalid tab value received:', tab);
      return;
    }

    // Update the selected type
    setSelectedType(tab);

    // Immediately regenerate with the new tab type
    // This avoids unnecessary clipboard operations and delays
    onRegenerate(tab);
  };

  const handleRegenerateClick = () => {
    const type = selectedType;
    console.log('Regenerating with type:', type);

    // Validate the type
    if (!['agent', 'general', 'answer'].includes(type)) {
      console.error('Invalid type for regeneration:', type);
      return;
    }

    // Always refresh the clipboard text to check for new content
    // This ensures we're always working with the latest text
    onRefreshText();

    // Add a small delay to ensure the clipboard refresh completes
    setTimeout(() => {
      // Force regeneration with the current type and no caching
      // Add a timestamp to ensure it's treated as a new request
      const timestamp = Date.now();
      console.log(`Forcing regeneration with type: ${type} at timestamp: ${timestamp}`);
      onRegenerate(`${type}?nocache=${timestamp}`);
    }, 100);
  };

  const handleEnhanceClick = () => {
    const type = selectedType;
    console.log('Initial enhancement with type:', type);

    // Ensure we're using a valid type
    if (!['agent', 'general', 'answer'].includes(type)) {
      console.error('Invalid type for initial enhancement:', type);
      return;
    }

    // First refresh the clipboard text to check for new content
    // This ensures we're always working with the latest text
    onRefreshText();

    // Add a small delay to ensure the clipboard refresh completes
    setTimeout(() => {
      // Then execute enhancement with the current type
      onRegenerate(type);
    }, 100);
  };

  return (
    <TooltipProvider>
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-xl border-2">
        <CardHeader className="pb-2 pt-4">
          <div className="flex justify-between items-center mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="h-4 w-4" />
                  History
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View and use previous prompts</p>
              </TooltipContent>
            </Tooltip>

            <GlowingTabs
              tabs={["Agent", "General", "Answer"]}
              defaultTab={selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
              onTabChange={handleTabChange}
            />

            <div className="w-[70px]"></div> {/* Spacer for balance */}
          </div>
        </CardHeader>

        {/* History Dialog */}
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Prompt History</DialogTitle>
            </DialogHeader>
            <div className="overflow-auto py-4">
              <PromptHistory
                onUsePrompt={(text) => {
                  navigator.clipboard.writeText(text);
                  setHistoryOpen(false);
                  // Directly use the text without refreshing clipboard
                  onConfirm(text);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        <CardContent className="flex-1 overflow-auto px-6 py-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-sm text-muted-foreground">Enhancing your prompt...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-base font-medium">
                  {selectedType === "agent" && "Agent Task Prompt"}
                  {selectedType === "general" && "Enhanced Prompt"}
                  {selectedType === "answer" && "Direct Answer"}
                </p>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedType === "agent" && "Optimized for AI coding assistants like Augment, Trae, and Cursor"}
                  {selectedType === "general" && "Enhanced for general LLMs like ChatGPT and Claude"}
                  {selectedType === "answer" && "Direct answer to your question instead of an enhanced prompt"}
                </div>
              </div>

              {enhancedText ? (
                <div className="rounded-md p-3">
                  <p className="text-sm">{enhancedText}</p>
                </div>
              ) : (
                <div className="rounded-md p-3">
                  <p className="text-sm">{originalText}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t pt-4 pb-4 flex justify-between px-6">
          <div className="flex w-full space-x-4 justify-center">
            {enhancedText && !isLoading ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={handleRegenerateClick}
                      disabled={isLoading}
                      className="flex-1 rounded-md"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {selectedType === "agent" && "Regenerate Agent"}
                      {selectedType === "general" && "Regenerate"}
                      {selectedType === "answer" && "Regenerate Answer"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Check clipboard for new text and regenerate</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleCopy}
                      className="flex-1 rounded-md"
                      disabled={isLoading}
                      variant={copied ? "secondary" : "default"}
                    >
                      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy to clipboard</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => onConfirm(enhancedText || "")}
                      className="flex-1 rounded-md"
                      disabled={isLoading || !enhancedText}
                      variant="secondary"
                    >
                      Use
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Use this text and close the popup</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleEnhanceClick}
                    className="w-full rounded-md"
                    disabled={isLoading}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    {selectedType === "agent" && "Create Agent Task"}
                    {selectedType === "general" && "Enhance Prompt"}
                    {selectedType === "answer" && "Generate Answer"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Process the text with AI</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardFooter>
      </Card>
      </div>
    </TooltipProvider>
  );
};

export default EnhancementPopup;