
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Key, Ghost } from "lucide-react";
import KeyboardShortcutConfig from "@/components/KeyboardShortcutConfig";
import WebModeInfo from "@/components/WebModeInfo";
import { electronAPI } from "@/utils/electronBridge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const ApiKeySetup = () => {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [availableModels, setAvailableModels] = useState<{id: string; name: string; description: string}[]>([]);
  const { toast } = useToast();
  const { user, isAuthenticated, updateApiKey, removeApiKey } = useAuth();

  // Load API key and settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First check if the user has an API key in their account
        let savedApiKey = "";
        if (isAuthenticated && user && user.apiKey) {
          savedApiKey = user.apiKey;
          // Ensure the API key in the user account is also in the electron store
          await electronAPI.setApiKey(user.apiKey);
        } else {
          // If not, fall back to the electron store
          savedApiKey = await electronAPI.getApiKey();

          // If we found a key in the electron store but not in the user account, update the user account
          if (savedApiKey && isAuthenticated && user) {
            await updateApiKey(savedApiKey);
          }
        }

        const savedModel = await electronAPI.getSelectedModel();
        const models = await electronAPI.getAvailableModels();

        const hasKey = !!savedApiKey;
        setApiKey(savedApiKey || "");
        setHasApiKey(hasKey);
        setSelectedModel(savedModel || "gpt-4o-mini");
        setAvailableModels(models || []);
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast({
          title: "Error",
          description: "Failed to load settings. Please try again.",
          variant: "destructive",
        });
      }
    };

    loadSettings();
  }, [toast, isAuthenticated, user, updateApiKey]);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "API key cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Save to electron store
      await electronAPI.setApiKey(apiKey);

      // If user is authenticated, also save to user account
      if (isAuthenticated) {
        await updateApiKey(apiKey);
      }

      setHasApiKey(true);
      toast({
        title: "Success",
        description: "API key saved successfully",
      });
    } catch (error) {
      console.error("Failed to save API key:", error);
      toast({
        title: "Error",
        description: "Failed to save API key",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleModelChange = async (modelId: string) => {
    try {
      await electronAPI.setSelectedModel(modelId);
      setSelectedModel(modelId);
      toast({
        title: "Success",
        description: `Model changed to ${availableModels.find(m => m.id === modelId)?.name || modelId}`,
      });
    } catch (error) {
      console.error("Failed to change model:", error);
      toast({
        title: "Error",
        description: "Failed to change model",
        variant: "destructive",
      });
    }
  };

  const handleRemoveApiKey = async () => {
    setRemoving(true);
    try {
      // Confirm with the user before removing the API key
      if (confirm("Are you sure you want to remove your API key? This action cannot be undone.")) {
        // Remove from electron store
        await electronAPI.removeApiKey();

        // If user is authenticated, also remove from user account
        if (isAuthenticated) {
          await removeApiKey();
        }

        setApiKey("");
        setHasApiKey(false);
        toast({
          title: "Success",
          description: "API key removed successfully",
        });
      }
    } catch (error) {
      console.error("Failed to remove API key:", error);
      toast({
        title: "Error",
        description: "Failed to remove API key",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <WebModeInfo />
        <Card className="w-full shadow-lg mb-6">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Ghost className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">AI Prompt Enhancer</CardTitle>
            <CardDescription className="text-center">
              Enter your OpenAI API key to enable prompt enhancement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">OpenAI API Key</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {isAuthenticated
                  ? "Your API key is stored securely in your account and locally"
                  : "Your API key is stored locally and securely"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">OpenAI Model</Label>
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Select the OpenAI model to use for text enhancements.
              </p>
            </div>


          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <Button
              className="w-full"
              onClick={handleSaveApiKey}
              disabled={loading || removing}
            >
              {loading ? "Saving..." : "Save API Key"}
            </Button>

            {hasApiKey && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleRemoveApiKey}
                disabled={loading || removing}
              >
                {removing ? "Removing..." : "Remove API Key"}
              </Button>
            )}
          </CardFooter>

          <div className="p-4 bg-muted/50 mt-4 rounded-b-lg">
            <p className="text-xs text-center text-muted-foreground">
              Use Cmd+Space+Space (Mac) or Ctrl+Space+Space (Windows/Linux) to enhance text
            </p>
          </div>
        </Card>

        <KeyboardShortcutConfig />
      </div>
    </div>
  );
};

export default ApiKeySetup;
