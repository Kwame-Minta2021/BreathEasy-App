
"use client";

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { NotificationsSidebar } from '@/components/dashboard/notifications-sidebar';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { ChatbotDialog } from '@/components/chatbot/chatbot-dialog';
import { Leaf, MessageCircle } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { Toaster } from "@/components/ui/toaster";
import { Button } from '../ui/button';


interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isChatbotOpen, setIsChatbotOpen] = React.useState(false);

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-4 items-center">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Leaf className="h-7 w-7 text-primary flex-shrink-0" />
            <h1 className="text-2xl font-bold text-primary font-headline group-data-[collapsible=icon]:hidden">
              {APP_NAME}
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-2 space-y-1">
          <NotificationsSidebar />
          
          <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton 
                    onClick={() => setIsChatbotOpen(true)}
                    tooltip={{ children: "AI Assistant", side: "right", align: "center" }}
                    className="w-full"
                >
                    <MessageCircle />
                    <span>AI Assistant</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="flex justify-center group-data-[collapsible=icon]:justify-center mt-1">
             <ThemeToggleButton />
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="py-6 text-center text-sm text-muted-foreground border-t">
            © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </footer>
      </SidebarInset>
      <ChatbotDialog isOpen={isChatbotOpen} onOpenChange={setIsChatbotOpen} />
      <Toaster />
    </SidebarProvider>
  );
}
