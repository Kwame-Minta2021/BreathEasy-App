
"use client";

import React from 'react';
import { CurrentReadingsGrid } from '@/components/dashboard/current-readings-grid';
import { AiInsightsSection } from '@/components/dashboard/ai-insights-section';
import { HistoricalDataChart } from '@/components/dashboard/historical-data-chart';
import { useAirQuality } from '@/contexts/air-quality-context';
import { Loader2, CalendarRange } from 'lucide-react';
import { INITIAL_POLLUTANTS_FOR_CHART } from '@/lib/constants';
import { TopActionsBar } from '@/components/layout/top-actions-bar';
import { DateRangePicker } from '@/components/ui/date-range-picker'; 
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function DashboardPage() {
  const {
    currentData,
    historicalData,
    aiAnalysis,
    actionRecommendations,
    isLoadingReadings,
    isLoadingAnalysis,
    isLoadingRecommendations,
    dateRange, 
    setDateRange, 
  } = useAirQuality();
  
  const filteredHistoricalData = React.useMemo(() => {
    if (!dateRange?.from) return historicalData; 
    
    const fromDate = dateRange.from;
    const toDate = dateRange.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : new Date();

    return historicalData.filter(reading => {
      const readingDate = new Date(reading.timestamp);
      const isAfterFrom = readingDate >= new Date(fromDate.setHours(0,0,0,0));
      const isBeforeTo = readingDate <= toDate;
      return isAfterFrom && isBeforeTo;
    });
  }, [historicalData, dateRange]);

  return (
    <div className="flex flex-col space-y-8">
      <TopActionsBar />
      {isLoadingReadings && !currentData ? (
        <div className="flex flex-col justify-center items-center h-64 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading initial air quality data...</p>
        </div>
      ) : (
        <>
          <CurrentReadingsGrid currentData={currentData} isLoading={!currentData} />
          
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex-grow">
                  <CardTitle className="font-headline flex items-center gap-2">
                     <CalendarRange className="h-5 w-5 text-primary" />
                     Historical Trends
                  </CardTitle>
                   <CardDescription className="text-sm text-muted-foreground">Select a date range to view pollutant trends.</CardDescription>
                </div>
                <DateRangePicker date={dateRange} onDateChange={setDateRange} className="mt-2 sm:mt-0"/>
              </div>
            </CardHeader>
            <CardContent>
              <HistoricalDataChart
                data={filteredHistoricalData}
                selectedPollutants={INITIAL_POLLUTANTS_FOR_CHART}
                isLoading={isLoadingReadings && filteredHistoricalData.length === 0}
              />
            </CardContent>
          </Card>
          
          <AiInsightsSection
            analysis={aiAnalysis}
            recommendations={actionRecommendations}
            isLoadingAnalysis={isLoadingAnalysis}
            isLoadingRecommendations={isLoadingRecommendations}
          />
        </>
      )}
      {/* Chatbot button removed from here, now in AppLayout sidebar footer */}
    </div>
  );
}
