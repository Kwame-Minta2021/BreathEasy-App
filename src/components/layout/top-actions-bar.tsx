
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PhoneForwarded, BarChartBig, Loader2 as ReportLoader } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { reportToControlRoom, fetchHealthRisks, fetchActionRecommendations } from '@/lib/actions';
import { useAirQuality } from '@/contexts/air-quality-context';

export function TopActionsBar() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentData, isLoadingReadings } = useAirQuality();
  const [isReporting, setIsReporting] = React.useState(false);

  const handleReport = async () => {
    if (!currentData) {
      toast({
        title: "Cannot Send Report",
        description: "Current air quality data is not available.",
        variant: "destructive",
      });
      return;
    }

    setIsReporting(true);
    toast({
      title: "Generating & Sending Report",
      description: "Fetching AI recommendations and sending to control room...",
    });

    try {
      // Fetch latest recommendations and health risks
      const [healthRes, recsRes] = await Promise.all([
        fetchHealthRisks({ currentReadings: currentData, forecastData: null }),
        fetchActionRecommendations({
            co: currentData.co,
            vocs: currentData.vocs,
            ch4Lpg: currentData.ch4Lpg,
            pm1_0: currentData.pm1_0,
            pm2_5: currentData.pm2_5,
            pm10: currentData.pm10_0,
        })
      ]);

      const riskLevel = healthRes.riskLevel || 'N/A';
      const advice = healthRes.advice?.join('; ') || 'No specific advice.';
      const recommendations = recsRes.recommendations?.join('; ') || 'No specific recommendations.';

      const smsMessage = `BreathEasy Alert! Risk Level: ${riskLevel}. Precautions: ${advice}. Actions: ${recommendations}.`;

      const result = await reportToControlRoom({ message: smsMessage });
      
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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start sm:justify-end gap-3 mb-6 p-2 sm:p-4 border bg-card rounded-lg shadow">
      <Button onClick={handleReport} disabled={isReporting || isLoadingReadings}>
        {isReporting ? (
          <ReportLoader className="mr-2 h-4 w-4 animate-spin" />
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
