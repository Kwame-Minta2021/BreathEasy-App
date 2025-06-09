
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { PhoneForwarded, BarChartBig, Loader2 as ReportLoader, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { reportToControlRoom } from '@/lib/actions';
import { useAirQuality } from '@/contexts/air-quality-context';
// import type { AirQualityReading } from '@/types'; // Not used directly

export function TopActionsBar() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentData } = useAirQuality();
  const [isReporting, setIsReporting] = React.useState(false);
  const [isGettingLocation, setIsGettingLocation] = React.useState(false);

  const handleReport = async () => {
    setIsGettingLocation(true);
    toast({
      title: "Location",
      description: "Attempting to retrieve your current location...",
    });

    let locationData: { latitude: number; longitude: number } | undefined = undefined;

    if (typeof window !== "undefined" && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }); // 10 second timeout
        });
        locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        toast({
          title: "Location Acquired",
          description: `Latitude: ${locationData.latitude.toFixed(4)}, Longitude: ${locationData.longitude.toFixed(4)}`,
        });
      } catch (error: any) {
        let errorMsg = "Could not retrieve location. Report will be sent without it.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission denied. Report will be sent without location.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable. Report will be sent without location.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Location request timed out. Report will be sent without location.";
        }
        toast({
          title: "Location Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Location Not Supported",
        description: "Geolocation is not supported by this browser. Report will be sent without location.",
        variant: "destructive",
      });
    }
    setIsGettingLocation(false);
    setIsReporting(true);

    const readingsForSms = currentData ? {
      co: currentData.co,
      vocs: currentData.vocs,
      ch4Lpg: currentData.ch4Lpg,
      pm1_0: currentData.pm1_0,
      pm2_5: currentData.pm2_5,
      pm10_0: currentData.pm10_0,
    } : undefined;

    try {
      const result = await reportToControlRoom({
        message: "User triggered emergency: Air quality concern from dashboard.",
        currentReadings: readingsForSms,
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-start sm:justify-end gap-3 mb-6 p-2 sm:p-4 border bg-card rounded-lg shadow">
      <Button onClick={handleReport} disabled={isReporting || isGettingLocation} className="w-full sm:w-auto">
        {isGettingLocation ? (
          <MapPin className="mr-2 h-4 w-4 animate-pulse" />
        ) : isReporting ? (
          <ReportLoader className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <PhoneForwarded className="mr-2 h-4 w-4" />
        )}
        {isGettingLocation ? "Getting Location..." : isReporting ? "Reporting..." : "Report to Control Room"}
      </Button>
      <Button variant="outline" onClick={navigateToReinforcementAnalysis} className="w-full sm:w-auto">
        <BarChartBig className="mr-2 h-4 w-4" />
        Reinforcement Analysis
      </Button>
    </div>
  );
}
