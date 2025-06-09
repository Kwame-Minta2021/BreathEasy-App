
"use client";

import React from 'react';
import { Bell, X, Settings, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAirQuality } from '@/contexts/air-quality-context';
import { format } from 'date-fns';
import { useSidebar } from '@/components/ui/sidebar';
import Link from 'next/link';
import { Separator } from '../ui/separator';

export function NotificationsSidebar() {
  const { notifications, clearNotification } = useAirQuality();
  const [isOpen, setIsOpen] = React.useState(false);
  const { state: sidebarState } = useSidebar();

  if (sidebarState === "collapsed") {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="relative w-full justify-center">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                </span>
                )}
                <span className="sr-only">Notifications</span>
            </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="absolute bottom-12 left-full ml-2 z-50">
          <Card className="w-80 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base">Notifications ({notifications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Expand sidebar to manage.</p>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <span>Notifications</span>
            {notifications.length > 0 && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                {notifications.length}
              </span>
            )}
          </div>
          <Settings className="h-4 w-4" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {notifications.length > 0 && (
          <Card>
            <CardHeader className="p-3">
                <CardTitle className="text-sm">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-32">
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
          </Card>
        )}
        <Card className="mt-2">
            <CardHeader className="p-3">
                <CardTitle className="text-sm">Alert Settings</CardTitle>
                <CardDescription className="text-xs">Configure your notification thresholds.</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
                 <Button asChild size="sm" variant="outline" className="w-full text-xs">
                    <Link href="/settings">
                        Manage Alert Settings <ArrowRight className="ml-2 h-3 w-3" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}
