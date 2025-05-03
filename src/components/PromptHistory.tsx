import React, { useState } from 'react';
import { usePrompts, Prompt } from '@/contexts/PromptContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Star, StarOff, Trash2, Copy, Clock, Search, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PromptItemProps {
  prompt: Prompt;
  onFavorite: (id: string) => void;
  onUnfavorite: (id: string) => void;
  onUse: (text: string) => void;
}

const PromptItem: React.FC<PromptItemProps> = ({ prompt, onFavorite, onUnfavorite, onUse }) => {
  const [showFullText, setShowFullText] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.text);
  };

  const truncatedText = prompt.text.length > 100 
    ? `${prompt.text.substring(0, 100)}...` 
    : prompt.text;

  return (
    <Card className="mb-3">
      <CardHeader className="py-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-sm font-medium">
              {prompt.title || `${prompt.type.charAt(0).toUpperCase() + prompt.type.slice(1)} Prompt`}
            </CardTitle>
            <CardDescription className="text-xs">
              {formatDistanceToNow(new Date(prompt.createdAt), { addSuffix: true })}
            </CardDescription>
          </div>
          <Badge variant="outline" className="ml-2">
            {prompt.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        <p className="text-sm text-muted-foreground">
          {showFullText ? prompt.text : truncatedText}
          {prompt.text.length > 100 && (
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs" 
              onClick={() => setShowFullText(!showFullText)}
            >
              {showFullText ? 'Show less' : 'Show more'}
            </Button>
          )}
        </p>
      </CardContent>
      <CardFooter className="py-2 flex justify-between">
        <div className="flex space-x-2">
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onUse(prompt.text)}>
            Use
          </Button>
        </div>
        <div>
          {prompt.isFavorite ? (
            <Button size="sm" variant="ghost" onClick={() => onUnfavorite(prompt.id)}>
              <StarOff className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => onFavorite(prompt.id)}>
              <Star className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

interface PromptHistoryProps {
  onUsePrompt: (text: string) => void;
}

const PromptHistory: React.FC<PromptHistoryProps> = ({ onUsePrompt }) => {
  const { history, favorites, addToFavorites, removeFromFavorites, clearHistory } = usePrompts();
  const [searchTerm, setSearchTerm] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);

  const filteredHistory = history.filter(prompt => 
    prompt.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFavorites = favorites.filter(prompt => 
    prompt.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClearHistory = async () => {
    await clearHistory();
    setShowClearDialog(false);
  };

  return (
    <div className="w-full">
      <Tabs defaultValue="history">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="history" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center">
              <Star className="h-4 w-4 mr-2" />
              Favorites
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search prompts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 w-[200px]"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <TabsContent value="history" className="mt-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Recent Prompts</h3>
            {history.length > 0 && (
              <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear History
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear History</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to clear your prompt history? This action cannot be undone.
                      Your favorite prompts will be preserved.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleClearHistory}>Clear History</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          
          <ScrollArea className="h-[400px] pr-4">
            {filteredHistory.length > 0 ? (
              filteredHistory.map(prompt => (
                <PromptItem
                  key={prompt.id}
                  prompt={prompt}
                  onFavorite={addToFavorites}
                  onUnfavorite={removeFromFavorites}
                  onUse={onUsePrompt}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No matching prompts found' : 'No prompt history yet'}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="favorites" className="mt-0">
          <h3 className="text-sm font-medium mb-2">Favorite Prompts</h3>
          <ScrollArea className="h-[400px] pr-4">
            {filteredFavorites.length > 0 ? (
              filteredFavorites.map(prompt => (
                <PromptItem
                  key={prompt.id}
                  prompt={prompt}
                  onFavorite={addToFavorites}
                  onUnfavorite={removeFromFavorites}
                  onUse={onUsePrompt}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No matching favorites found' : 'No favorite prompts yet'}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromptHistory;
