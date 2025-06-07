
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PhoneForwarded, BarChartBig } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { reportToControlRoom } from '@/lib/actions'; // Assuming this action will be created

export function TopActionsBar() {
  const router = useRouter();
  const { toast } = useToast();
  const [isReporting, setIsReporting] = React.useState(false);

  const handleReport = async () => {
    setIsReporting(true);
    try {
      // In a real app, you might pass current location or specific data
      const result = await reportToControlRoom({ message: "Emergency: Air quality alert at current location." });
      toast({
        title: "Report Sent",
        description: result.confirmationMessage || "Control room has been notified.",
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
    <div className="flex flex-col sm:flex-row items-center justify-end gap-2 mb-6 p-4 border bg-card rounded-lg shadow">
      <Button onClick={handleReport} disabled={isReporting}>
        <PhoneForwarded className="mr-2 h-4 w-4" />
        {isReporting ? "Reporting..." : "Report to Control Room"}
      </Button>
      <Button variant="outline" onClick={navigateToReinforcementAnalysis}>
        <BarChartBig className="mr-2 h-4 w-4" />
        Reinforcement Analysis
      </Button>
    </div>
  );
}
