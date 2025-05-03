import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isElectron } from "@/utils/electronBridge";
import { Info } from "lucide-react";
import { useState } from "react";

/**
 * This component displays information about running the app in web mode
 * and provides guidance on how to test features that would normally
 * require Electron functionality.
 */
const WebModeInfo = () => {
  const [showInfo, setShowInfo] = useState(true);
  
  // Only show this component in web mode (not in Electron)
  if (isElectron() || !showInfo) return null;

  return (
    <Alert className="mb-4">
      <Info className="h-4 w-4" />
      <AlertTitle>Running in Web Mode</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-2">
          You are running the Prompt Enhancer in web mode. Some features are limited compared to the desktop app:
        </p>
        <ul className="list-disc pl-5 mb-2 space-y-1">
          <li>
            <strong>Keyboard shortcuts</strong> will show an alert instead of enhancing text
          </li>
          <li>
            <strong>Clipboard access</strong> requires permission and may be limited by your browser
          </li>
          <li>
            <strong>Auto-paste</strong> functionality is not available in web mode
          </li>
        </ul>
        <p className="mb-2">
          To test the keyboard shortcut, try pressing <code className="bg-muted px-1 rounded">Cmd+Space+Space</code> (Mac) 
          or <code className="bg-muted px-1 rounded">Ctrl+Space+Space</code> (Windows/Linux) after copying some text.
        </p>
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowInfo(false)}>
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default WebModeInfo;