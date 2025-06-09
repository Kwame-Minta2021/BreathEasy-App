
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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { NotificationsSidebar } from '@/components/dashboard/notifications-sidebar';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { ChatbotDialog } from '@/components/chatbot/chatbot-dialog';
import { Leaf, MessageCircle, Settings as SettingsIcon } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { Toaster } from "@/components/ui/toaster";
import Link from 'next/link';


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
        <SidebarFooter className="p-2 flex flex-col">
          <SidebarMenu className="space-y-1">
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
            
            <SidebarMenuItem>
              {/* NotificationsSidebar component now returns a Collapsible triggered by SidebarMenuButton */}
              <NotificationsSidebar />
            </SidebarMenuItem>

            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    tooltip={{ children: "Settings", side: "right", align: "center" }}
                    className="w-full"
                >
                  <Link href="/settings">
                    <SettingsIcon />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          <div className="mt-auto pt-2 border-t border-sidebar-border"> {/* Pushes ThemeToggle to bottom */}
            <div className="flex justify-center group-data-[collapsible=icon]:justify-center">
              <ThemeToggleButton />
            </div>
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
