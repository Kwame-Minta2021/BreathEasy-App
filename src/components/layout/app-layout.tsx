
"use client";

import React from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar, // Assuming useSidebar is correctly imported from the same file as SidebarProvider
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { NotificationsSidebar } from '@/components/dashboard/notifications-sidebar';
import { ChatbotDialog } from '@/components/chatbot/chatbot-dialog';
import { Leaf, MessageCircle, Settings as SettingsIcon, Sun, Moon, Loader2 } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { Toaster } from "@/components/ui/toaster";
import Link from 'next/link';
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SheetTitle } from '@/components/ui/sheet';


interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [appLayoutMounted, setAppLayoutMounted] = React.useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = React.useState(false);
  const { setTheme, resolvedTheme } = useTheme();
  
  React.useEffect(() => {
    setAppLayoutMounted(true);
  }, []);

  // Defer calling useSidebar and accessing its properties until appLayoutMounted
  const sidebarHookResult = appLayoutMounted ? useSidebar() : null;
  const isMobile = sidebarHookResult ? sidebarHookResult.isMobile : false; // Default for SSR/pre-mount

  if (!appLayoutMounted) {
    // Render null or a minimal placeholder if not mounted, to ensure SidebarProvider has initialized
    return null; 
  }

  // Now that appLayoutMounted is true, sidebarHookResult should be valid if SidebarProvider has also mounted.
  // If sidebarHookResult is still null here, it means SidebarProvider hasn't provided context yet,
  // which would be unexpected if SidebarProvider itself waits for mount.

  if (!sidebarHookResult) {
    // This case indicates SidebarProvider might not have mounted and provided context yet.
    // Return a loader or null to prevent errors from useSidebar() in child components like <Sidebar />
     return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Initializing Layout...</p>
      </div>
    );
  }


  return (
    <>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="p-4 items-center">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <Leaf className="h-7 w-7 text-primary flex-shrink-0" />
            {isMobile ? (
              <SheetTitle className="text-2xl font-bold text-primary font-headline group-data-[collapsible=icon]:hidden">
                {APP_NAME}
              </SheetTitle>
            ) : (
              <div className="text-2xl font-bold text-primary font-headline group-data-[collapsible=icon]:hidden">
                {APP_NAME}
              </div>
            )}
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

            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    className="w-full"
                    tooltip={{ children: "Change Theme", side: "right", align: "center" }}
                  >
                    {resolvedTheme === 'dark' ? <Moon /> : <Sun />}
                    <span>Change Theme</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" sideOffset={8}>
                  <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
          {sidebarHookResult && <SidebarTrigger />} {/* Ensure sidebarHookResult is available for SidebarTrigger */}
          <Link href="/" className="text-lg font-bold text-primary font-headline">
            {APP_NAME}
          </Link>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-accent">
                {resolvedTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                <span className="sr-only">Toggle theme</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <main className="flex-grow container mx-auto px-4 pt-20 pb-8 md:pt-8 md:pb-8">
          {children}
        </main>
      </SidebarInset>
      <ChatbotDialog isOpen={isChatbotOpen} onOpenChange={setIsChatbotOpen} />
      <Toaster />
    </>
  );
}
