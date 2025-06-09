
"use client";

import React from 'react';
import { CurrentReadingsGrid } from '@/components/dashboard/current-readings-grid';
import { AiInsightsSection } from '@/components/dashboard/ai-insights-section';
import { HistoricalDataChart } from '@/components/dashboard/historical-data-chart';
import { ChatbotDialog } from '@/components/chatbot/chatbot-dialog';
import { Button } from '@/components/ui/button';
import { useAirQuality } from '@/contexts/air-quality-context';
import { MessageCircle, Loader2, CalendarRange } from 'lucide-react';
import { INITIAL_POLLUTANTS_FOR_CHART } from '@/lib/constants';
import { TopActionsBar } from '@/components/layout/top-actions-bar';
import { DateRangePicker } from '@/components/ui/date-range-picker'; // Import the new component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const {
    currentData,
    historicalData,
    aiAnalysis,
    actionRecommendations,
    isLoadingReadings,
    isLoadingAnalysis,
    isLoadingRecommendations,
    dateRange, // Get dateRange from context
    setDateRange, // Get setDateRange from context
  } = useAirQuality();
  
  const [isChatbotOpen, setIsChatbotOpen] = React.useState(false);

  // Filter historical data based on the selected date range
  const filteredHistoricalData = React.useMemo(() => {
    if (!dateRange?.from) return historicalData; // Show all if no start date
    
    const fromDate = dateRange.from;
    // If only 'from' is selected, 'to' defaults to 'from' for a single day, or set to a far future if range is open-ended
    // For this chart, let's assume 'to' should be set if 'from' is.
    // Or, if 'to' is undefined, consider it as up to the latest available data.
    const toDate = dateRange.to ? new Date(dateRange.to.setHours(23, 59, 59, 999)) : new Date(); // up to end of day or now

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
                   <p className="text-sm text-muted-foreground">Select a date range to view pollutant trends.</p>
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
      <Button
        variant="default"
        size="lg"
        className="fixed bottom-6 right-6 rounded-full shadow-xl p-4 h-16 w-16 z-50"
        onClick={() => setIsChatbotOpen(true)}
        aria-label="Open AI Chatbot"
      >
        <MessageCircle className="h-8 w-8" />
      </Button>
      <ChatbotDialog isOpen={isChatbotOpen} onOpenChange={setIsChatbotOpen} />
    </div>
  );
}
