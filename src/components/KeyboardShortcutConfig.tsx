import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Keyboard, RotateCcw } from "lucide-react";
import { electronAPI } from "@/utils/electronBridge";

const KeyboardShortcutConfig = () => {
  const [shortcut, setShortcut] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [recording, setRecording] = useState(false);
  const { toast } = useToast();

  // Load current shortcut on component mount
  useEffect(() => {
    const loadShortcut = async () => {
      try {
        const savedShortcut = await electronAPI.getKeyboardShortcut();
        setShortcut(savedShortcut || "");
      } catch (error) {
        console.error("Failed to load keyboard shortcut:", error);
      }
    };

    loadShortcut();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();

    const keys = [];

    // Add modifiers
    if (e.ctrlKey) keys.push("CommandOrControl");
    if (e.altKey) keys.push("Alt");
    if (e.shiftKey) keys.push("Shift");

    // Add the actual key
    let key = e.key;

    // Handle special keys
    if (key === " ") key = "Space";
    if (key.length === 1) key = key.toUpperCase();

    // Don't allow modifier-only shortcuts
    if (["Control", "Alt", "Shift", "Meta", "Command"].includes(key)) return;

    keys.push(key);

    // Set the shortcut string
    const shortcutString = keys.join("+");
    setShortcut(shortcutString);
    setRecording(false);
  };

  const handleSaveShortcut = async () => {
    if (!shortcut.trim()) {
      toast({
        title: "Error",
        description: "Keyboard shortcut cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await electronAPI.setKeyboardShortcut(shortcut);
      toast({
        title: "Success",
        description: "Keyboard shortcut saved successfully. It will take effect immediately.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save keyboard shortcut",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetShortcut = async () => {
    setResetting(true);
    try {
      const defaultShortcut = await electronAPI.resetKeyboardShortcut();
      setShortcut(defaultShortcut);
      toast({
        title: "Success",
        description: "Keyboard shortcut reset to default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset keyboard shortcut",
        variant: "destructive",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Keyboard Shortcut
        </CardTitle>
        <CardDescription>
          Configure the keyboard shortcut used to trigger the prompt enhancer.
          Default is Command+Space+Space on macOS and Ctrl+Space+Space on Windows/Linux.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shortcut">Shortcut</Label>
            <div className="relative">
              <Input
                id="shortcut"
                value={shortcut}
                placeholder={recording ? "Recording... Press any key combo" : "e.g. CommandOrControl+Space+Space"}
                onKeyDown={handleKeyDown}
                readOnly
                className={recording ? "border-primary" : ""}
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setRecording(!recording)}
              >
                {recording ? "Recording..." : "Record"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Click 'Record' then press your desired key combination.
              <br />
              Use CommandOrControl for Cmd on macOS or Ctrl on Windows/Linux.
              <br />
              Valid modifiers: CommandOrControl, Option, Alt, Shift, Super
              <br />
              Valid keys: A-Z, 0-9, F1-F24, Space, Tab, Plus, etc.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleResetShortcut}
          disabled={resetting}
        >
          {resetting ? "Resetting..." : "Reset to Default"}
          <RotateCcw className="ml-2 h-4 w-4" />
        </Button>
        <Button
          onClick={handleSaveShortcut}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Shortcut"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default KeyboardShortcutConfig;