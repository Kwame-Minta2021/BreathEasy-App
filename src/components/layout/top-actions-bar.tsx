
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PhoneForwarded, BarChartBig, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { reportToControlRoom } from '@/lib/actions';
import { useAirQuality } from '@/contexts/air-quality-context'; // Import useAirQuality
import type { AirQualityReading } from '@/types';


export function TopActionsBar() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentData } = useAirQuality(); // Get currentData from context
  const [isReporting, setIsReporting] = React.useState(false);

  const handleReport = async () => {
    setIsReporting(true);
    try {
      const readingsForSms = currentData ? {
        co: currentData.co,
        vocs: currentData.vocs,
        ch4Lpg: currentData.ch4Lpg,
        pm1_0: currentData.pm1_0,
        pm2_5: currentData.pm2_5,
        pm10_0: currentData.pm10_0,
      } : undefined;

      const result = await reportToControlRoom({
        message: "User triggered emergency: Air quality concern from dashboard.",
        currentReadings: readingsForSms
      });
      toast({
        title: "Report Status",
        description: result.confirmationMessage || "Control room notification process completed.",
      });
    } catch (error) {
      console.error("Error reporting to control room:", error);
      toast({
        title: "Report Failed",
        description: "Could not send report to control room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsReporting(false);
    }
  };

  const navigateToReinforcementAnalysis = () => {
    router.push('/reinforcement-analysis');
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start sm:justify-end gap-3 mb-6 p-4 border bg-card rounded-lg shadow">
      <Button onClick={handleReport} disabled={isReporting} className="w-full sm:w-auto">
        {isReporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <PhoneForwarded className="mr-2 h-4 w-4" />
        )}
        {isReporting ? "Reporting..." : "Report to Control Room"}
      </Button>
      <Button variant="outline" onClick={navigateToReinforcementAnalysis} className="w-full sm:w-auto">
        <BarChartBig className="mr-2 h-4 w-4" />
        Reinforcement Analysis
      </Button>
    </div>
  );
}
