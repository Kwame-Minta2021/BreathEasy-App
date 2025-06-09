
"use client";

import React from 'react';
import { Bell, X, ArrowRight } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAirQuality } from '@/contexts/air-quality-context';
import { format } from 'date-fns';
import { useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button'; // Keep for X button
import { SidebarMenuButton } from '@/components/ui/sidebar'; // Import for the trigger

export function NotificationsSidebar() {
  const { notifications, clearNotification } = useAirQuality();
  const [isOpen, setIsOpen] = React.useState(false);
  const { state: sidebarState, isMobile } = useSidebar();

  // In mobile view or when sidebar is collapsed, the content might pop out or behave differently.
  // For now, the pop-out logic is maintained for collapsed desktop.
  // The trigger will now be a SidebarMenuButton.

  if (sidebarState === "collapsed" && !isMobile) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="w-full justify-center"
            tooltip={{ children: `Notifications (${notifications.length})`, side: "right", align: "center" }}
            variant="ghost" // Match previous style for collapsed icon button
            size="icon"     // Match previous style for collapsed icon button
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
            )}
            <span className="sr-only">Notifications</span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="absolute bottom-full mb-2 left-0 right-0 z-50 mx-auto w-80 group-data-[side=left]:left-full group-data-[side=left]:ml-2 group-data-[side=right]:right-full group-data-[side=right]:mr-2">
          <Card className="shadow-xl">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-base">Notifications ({notifications.length})</CardTitle>
            </CardHeader>
            {notifications.length > 0 ? (
              <CardContent className="p-3">
                <ScrollArea className="h-40">
                  <ul className="space-y-1">
                    {notifications.map(notif => (
                      <li key={notif.id} className="text-xs p-1.5 bg-muted/50 rounded-md">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{notif.pollutantName} Alert</span>
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => clearNotification(notif.id)}>
                            <X className="h-3 w-3"/>
                          </Button>
                        </div>
                        <p className="text-muted-foreground">{notif.message}</p>
                        <p className="text-muted-foreground text-[10px]">{format(notif.timestamp, "MMM d, HH:mm")}</p>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </CardContent>
            ) : (
              <CardContent className="p-3">
                <p className="text-sm text-muted-foreground">No new notifications.</p>
              </CardContent>
            )}
          </Card>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <SidebarMenuButton 
          className="w-full"
          // isActive={isOpen} // Optionally manage active state
        >
          <Bell />
          <span>Notifications</span>
          {notifications.length > 0 && (
            <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {notifications.length}
            </span>
          )}
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 px-2">
        {isOpen && notifications.length > 0 && ( // Only render content if open and has notifications
          <Card className="border-sidebar-border bg-sidebar-accent/50">
            <CardHeader className="p-2">
                <CardTitle className="text-xs font-medium">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-32">
                <ul className="space-y-1">
                  {notifications.map(notif => (
                    <li key={notif.id} className="text-xs p-1.5 bg-background/50 dark:bg-sidebar-accent rounded-md">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{notif.pollutantName} Alert</span>
                        <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => clearNotification(notif.id)}>
                          <X className="h-3 w-3"/>
                        </Button>
                      </div>
                      <p className="text-muted-foreground">{notif.message}</p>
                      <p className="text-muted-foreground text-[10px]">{format(notif.timestamp, "MMM d, HH:mm")}</p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
         {isOpen && notifications.length === 0 && (
            <div className="p-2 text-xs text-muted-foreground">No new notifications.</div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
