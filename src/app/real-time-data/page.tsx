
"use client";

import React, { useEffect, useState } from 'react';
import { useAirQuality } from '@/contexts/air-quality-context';
import { CurrentReadingsGrid } from '@/components/dashboard/current-readings-grid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export default function RealTimeDataPage() {
  const { currentData, historicalData, isLoadingReadings } = useAirQuality();
  const [displayTimestamp, setDisplayTimestamp] = useState<string | null>(null);

  useEffect(() => {
    if (isLoadingReadings) {
      setDisplayTimestamp(null); // Or "Loading..." or keep previous value
      return;
    }

    if (historicalData.length > 0) {
      setDisplayTimestamp(format(historicalData[historicalData.length - 1].timestamp, "PPP p"));
    } else if (currentData) { 
      // Fallback to current time only if currentData is available (implying an update happened client-side)
      // and historicalData is still empty (e.g., context just initialized)
      setDisplayTimestamp(format(new Date(), "PPP p"));
    } else {
      // If no historical data and no current data (e.g. initial load state before context provides anything)
      setDisplayTimestamp(null); 
    }
  }, [historicalData, currentData, isLoadingReadings]);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Live Sensor Feeds</CardTitle>
          {displayTimestamp && !isLoadingReadings && (
            <p className="text-sm text-muted-foreground">
              Last updated: {displayTimestamp}
            </p>
          )}
           {isLoadingReadings && !displayTimestamp && (
             <p className="text-sm text-muted-foreground">Fetching latest update time...</p>
           )}
        </CardHeader>
        <CardContent>
          {isLoadingReadings && !currentData ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-3 text-muted-foreground">Fetching live data...</p>
            </div>
          ) : (
            <CurrentReadingsGrid currentData={currentData} isLoading={isLoadingReadings && !currentData} />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="font-headline">Raw Data Stream (Last 5 readings)</CardTitle>
        </CardHeader>
        <CardContent>
        {historicalData.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-muted">
                        <tr>
                            <th className="p-2 text-left">Time</th>
                            <th className="p-2 text-right">CO (ppm)</th>
                            <th className="p-2 text-right">VOCs (ppb)</th>
                            <th className="p-2 text-right">CH4/LPG (ppm)</th>
                            <th className="p-2 text-right">PM1.0 (µg/m³)</th>
                            <th className="p-2 text-right">PM2.5 (µg/m³)</th>
                            <th className="p-2 text-right">PM10 (µg/m³)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {historicalData.slice(-5).reverse().map(reading => (
                            <tr key={reading.timestamp.toISOString()} className="border-b">
                                <td className="p-2">{format(reading.timestamp, "HH:mm:ss")}</td>
                                <td className="p-2 text-right">{reading.co.toFixed(1)}</td>
                                <td className="p-2 text-right">{reading.vocs.toFixed(1)}</td>
                                <td className="p-2 text-right">{reading.ch4Lpg.toFixed(1)}</td>
                                <td className="p-2 text-right">{reading.pm1_0.toFixed(1)}</td>
                                <td className="p-2 text-right">{reading.pm2_5.toFixed(1)}</td>
                                <td className="p-2 text-right">{reading.pm10_0.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : (
            <p className="text-muted-foreground">No historical data available yet.</p>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
