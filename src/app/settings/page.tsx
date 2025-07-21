
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Settings as SettingsIcon } from 'lucide-react';
import { useAirQuality } from '@/contexts/air-quality-context';
import type { UserThresholds } from '@/types';
import { POLLUTANTS_LIST } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { thresholds, updateThreshold } = useAirQuality();
  const [localThresholds, setLocalThresholds] = useState<Partial<UserThresholds>>(thresholds);
  const { toast } = useToast();

  useEffect(() => {
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
      if (value !== undefined && value !== null && !isNaN(value)) {
        updateThreshold(p.id, value);
      } else {
        updateThreshold(p.id, Number.MAX_SAFE_INTEGER); 
      }
    });
    toast({
      title: "Settings Saved",
      description: "Your alert thresholds have been updated.",
    });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <SettingsIcon className="text-primary h-6 w-6" />
            Notification Settings
          </CardTitle>
          <CardDescription>Set custom alert thresholds for each pollutant. You will be notified when these levels are exceeded.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {POLLUTANTS_LIST.map(pollutant => (
            <div key={pollutant.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 border-b pb-3 last:border-b-0 last:pb-0">
              <Label htmlFor={`threshold-${pollutant.id}`} className="text-sm font-medium w-full sm:w-1/3">
                {pollutant.name} ({pollutant.unit})
              </Label>
              <Input
                id={`threshold-${pollutant.id}`}
                type="number"
                step="any"
                value={localThresholds[pollutant.id]?.toString() === Number.MAX_SAFE_INTEGER.toString() ? '' : localThresholds[pollutant.id]?.toString() ?? ''}
                onChange={(e) => handleThresholdChange(pollutant.id, e.target.value)}
                placeholder={`e.g., ${pollutant.whoGuideline || (pollutant.id === 'co' ? '5' : '25')}`}
                className="h-9 text-sm flex-1"
              />
            </div>
          ))}
          <Button size="lg" onClick={handleSaveThresholds} className="w-full sm:w-auto mt-4">
            <Save className="mr-2 h-4 w-4" /> Save Thresholds
          </Button>
        </CardContent>
      </Card>
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            Other Settings
          </CardTitle>
          <CardDescription>Manage other application preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">More application settings will be available here in a future update.</p>
        </CardContent>
      </Card>
    </div>
  );
}
