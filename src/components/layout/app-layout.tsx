
"use client";

import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { NotificationsSidebar } from '@/components/dashboard/notifications-sidebar';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { Leaf } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { Toaster } from "@/components/ui/toaster";


interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
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
        <SidebarFooter className="p-2 space-y-2">
          <NotificationsSidebar />
          <div className="flex justify-center group-data-[collapsible=icon]:justify-center">
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
      <Toaster />
    </SidebarProvider>
  );
}
