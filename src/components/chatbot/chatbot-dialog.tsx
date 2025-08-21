
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { askChatbot } from '@/lib/actions';
import { Separator } from '../ui/separator';
import type { ChatMessage } from '@/types';
import { useAirQuality } from '@/contexts/air-quality-context';
import { Message } from 'genkit';

interface ChatbotDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChatbotDialog({ isOpen, onOpenChange }: ChatbotDialogProps) {
  const { currentData, historicalData, notifications } = useAirQuality();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
       setMessages([{ role: 'model', content: "Hello! How can I help you with your air quality questions today?" }]);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userQuestion = inputValue;
    const userMessage: ChatMessage = {
      role: 'user',
      content: userQuestion,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const historicalForApi = historicalData.slice(-10).map(r => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
      }));

      const notificationsForApi = notifications.slice(0, 5).map(n => ({
        ...n,
        timestamp: n.timestamp.toISOString(),
      }));
      
      const context = {
          currentReadings: currentData,
          historicalData: historicalForApi,
          activeNotifications: notificationsForApi,
      };

      // Combine user question with the full context.
      const contentWithContext = `${userQuestion}

Here is the data context for my question:
${JSON.stringify(context, null, 2)}`;

      const historyForApi: Message[] = [
        ...messages.map(msg => ({
            role: msg.role,
            content: [{ text: msg.content }],
        })),
        { // The new user message with the full context
            role: 'user',
            content: [{ text: contentWithContext }]
        }
      ];
      
      const response = await askChatbot({ history: historyForApi });
      
      const botMessage: ChatMessage = {
        role: 'model',
        content: response.answer,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error in chatbot dialog:", error);
      const errorMessage: ChatMessage = {
        role: 'model',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:sm:max-w-[550px] p-0 grid grid-rows-[auto_1px_1fr_1px_auto] max-h-[80vh]">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 font-headline">
            <Bot className="h-6 w-6 text-primary" />
            Air Quality Assistant
          </DialogTitle>
          <DialogDescription>
            Ask me about current or past readings, health impacts, or active alerts.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <ScrollArea className="min-h-0" ref={scrollAreaRef}>
          <div className="space-y-4 p-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-end gap-2 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'model' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback><Bot size={18}/></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted' 
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                   <Avatar className="h-8 w-8">
                    <AvatarFallback><User size={18} /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-2 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot size={18}/></AvatarFallback>
                </Avatar>
                <div className="max-w-[75%] rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <Separator />
        <DialogFooter className="p-4 pt-2 sm:p-6 sm:pt-2 border-t">
          <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
