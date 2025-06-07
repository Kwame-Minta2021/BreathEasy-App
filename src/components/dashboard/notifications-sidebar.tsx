
"use client";

import React, { useState } from 'react';
import { Bell, X, Settings, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAirQuality } from '@/contexts/air-quality-context';
import type { Pollutant, UserThresholds } from '@/types';
import { POLLUTANTS_LIST } from '@/lib/constants';
import { format } from 'date-fns';
import { useSidebar } from '@/components/ui/sidebar';

export function NotificationsSidebar() {
  const { notifications, thresholds, updateThreshold, clearNotification } = useAirQuality();
  const [isOpen, setIsOpen] = useState(false);
  const [localThresholds, setLocalThresholds] = useState<Partial<UserThresholds>>(thresholds);
  const { state: sidebarState } = useSidebar();

  React.useEffect(() => {
    setLocalThresholds(thresholds);
  }, [thresholds]);

  const handleThresholdChange = (pollutantId: keyof UserThresholds, value: string) => {
    const numValue = parseFloat(value);
    setLocalThresholds(prev => ({
      ...prev,
      [pollutantId]: isNaN(numValue) ? undefined : numValue,
    }));
  };

  const handleSaveThresholds = () => {
    POLLUTANTS_LIST.forEach(p => {
      const value = localThresholds[p.id];
      if (value !== undefined) {
        updateThreshold(p.id, value);
      } else {
         // If user clears input, effectively remove threshold by setting to a high value or specific handling
        updateThreshold(p.id, Number.MAX_SAFE_INTEGER); // Or handle undefined specifically in context
      }
    });
    // TODO: Add toast notification for saved settings
  };

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
            {/* Content for collapsed sidebar is tricky, usually a popover is better */}
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
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-sm">Alert Settings</CardTitle>
            <CardDescription className="text-xs">Set thresholds for pollutants.</CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <ScrollArea className="h-32">
              {POLLUTANTS_LIST.map(pollutant => (
                <div key={pollutant.id} className="flex items-center gap-2 mb-1">
                  <Label htmlFor={`threshold-${pollutant.id}`} className="text-xs w-1/3 truncate">{pollutant.name}</Label>
                  <Input
                    id={`threshold-${pollutant.id}`}
                    type="number"
                    step="any"
                    value={localThresholds[pollutant.id]?.toString() ?? ''}
                    onChange={(e) => handleThresholdChange(pollutant.id, e.target.value)}
                    placeholder={pollutant.unit}
                    className="h-7 text-xs flex-1"
                  />
                </div>
              ))}
            </ScrollArea>
            <Button size="sm" onClick={handleSaveThresholds} className="w-full text-xs">
              <Save className="mr-1 h-3 w-3" /> Save Thresholds
            </Button>
          </CardContent>
        </Card>
        {notifications.length > 0 && (
          <Card className="mt-2">
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
      </CollapsibleContent>
    </Collapsible>
  );
}
