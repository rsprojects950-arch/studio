
'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Send, Loader2, Bot, User, BookOpen, Hash } from 'lucide-react';
import { AppLogo } from '@/components/icons/logo';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { askBot } from '@/ai/flows/bot-flow';

type Message = {
  text: string;
  sender: 'user' | 'bot';
  id: string;
};

export default function BtBotPage() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { text: input, sender: 'user', id: Date.now().toString() };
    setMessages(prev => [...prev, userMessage]);
    
    const processedInput = input;

    setInput('');
    setIsLoading(true);

    try {
      console.log('[handleSendMessage] Sending to bot:', processedInput);
      const botResponseText = await askBot(processedInput);
      console.log('[handleSendMessage] Bot response:', botResponseText);
      
      const botMessage: Message = { text: botResponseText, sender: 'bot', id: (Date.now() + 1).toString() };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('[handleSendMessage] Frontend error:', error);
      const errorMessage: Message = {
        text: 'Sorry, something went wrong. Please try again.',
        sender: 'bot',
        id: (Date.now() + 1).toString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-1 overflow-hidden">
         <ScrollArea className="h-full p-4 md:p-6" ref={scrollAreaRef}>
          <div className="space-y-6 pr-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                 <AppLogo className="w-24 h-24 mb-4 text-primary/50" />
                 <h2 className="text-2xl font-semibold">Welcome to BT-bot</h2>
                 <p>I'm your personal AI assistant. How can I help you today?</p>
              </div>
            ) : (
              messages.map(message => (
                <div key={message.id} className={`flex items-start gap-4 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                  {message.sender === 'bot' && (
                    <Avatar className="w-8 h-8 border">
                      <AvatarFallback><Bot className="w-5 h-5 text-primary" /></AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-lg rounded-lg px-4 py-3 ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                     <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                  </div>
                  {message.sender === 'user' && profile && (
                     <Avatar className="w-8 h-8">
                        <AvatarImage src={profile.photoURL || undefined} alt={profile.username} />
                        <AvatarFallback>{profile.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-start gap-4">
                <Avatar className="w-8 h-8 border">
                  <AvatarFallback><Loader2 className="w-5 h-5 text-primary animate-spin" /></AvatarFallback>
                </Avatar>
                <div className="max-w-lg rounded-lg px-4 py-3 bg-muted">
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
             <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask BT-bot anything..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
