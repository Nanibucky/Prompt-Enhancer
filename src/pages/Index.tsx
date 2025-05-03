import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Settings, Clipboard, Keyboard, ArrowRight, Ghost } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  const [apiKeySet, setApiKeySet] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const hasAccountApiKey = isAuthenticated && user && !!user.apiKey;

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.api) {
        try {
          const apiKey = await window.api.getApiKey();

          const hasApiKey = !!apiKey;
          setApiKeySet(hasApiKey);
        } catch (error) {
          console.error("Failed to check API key:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkApiKey();
  }, []);

  const handleSetupClick = () => {
    navigate('/setup');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/50 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-lg border-border">
        <CardHeader>
          <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
            <Ghost className="h-6 w-6 text-primary" />
            AI Prompt Enhancer
          </CardTitle>
          <CardDescription className="text-center">
            Enhance your prompts with GPT-4 using a simple keyboard shortcut
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
              <Settings className="h-5 w-5" />
              System Status
            </h3>
            <div className="bg-muted/40 p-4 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Authentication</span>
                {isAuthenticated ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" /> Logged In
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <XCircle className="h-3 w-3 mr-1" /> Not Logged In
                  </Badge>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">OpenAI API Key</span>
                {apiKeySet ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <XCircle className="h-3 w-3 mr-1" /> Not Set
                  </Badge>
                )}
              </div>


              {isAuthenticated && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">API Key in Account</span>
                  {hasAccountApiKey ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" /> Saved
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <XCircle className="h-3 w-3 mr-1" /> Not Saved
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
              <Keyboard className="h-5 w-5" />
              How to Use
            </h3>
            <div className="bg-muted/40 p-4 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <div className="bg-background rounded p-1 text-xs font-mono mt-1">1</div>
                <p className="text-sm">Copy text you want to enhance</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-background rounded p-1 text-xs font-mono mt-1">2</div>
                <p className="text-sm">Press {navigator.platform.includes('Mac') ? 'Cmd+Space+Space' : 'Ctrl+Space+Space'}</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="bg-background rounded p-1 text-xs font-mono mt-1">3</div>
                <p className="text-sm">Enhanced text replaces clipboard content</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium flex items-center gap-2 mb-2">
              <Clipboard className="h-5 w-5" />
              Example
            </h3>
            <div className="space-y-3">
              <div className="bg-muted/40 p-3 rounded-lg text-sm">
                <p className="font-medium text-xs uppercase text-muted-foreground mb-1">Input:</p>
                <p>how to use llm for making bots?</p>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="text-muted-foreground" />
              </div>
              <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg text-sm">
                <p className="font-medium text-xs uppercase text-muted-foreground mb-1">Enhanced:</p>
                <p>"What are the best practices for using large language models (LLMs) to build intelligent and efficient chatbots, including architecture and prompt strategies?"</p>
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          {isAuthenticated ? (
            <>
              <Button onClick={() => navigate("/setup")} className="w-full">
                {apiKeySet ? "Modify Settings" : "Set Up API Key"}
              </Button>
              <Button onClick={logout} variant="outline" className="w-full">
                Logout
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate("/login")} className="w-full">
              Login to Get Started
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default Index;
