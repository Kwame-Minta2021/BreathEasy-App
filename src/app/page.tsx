
"use client";

import React from 'react';
import { CurrentReadingsGrid } from '@/components/dashboard/current-readings-grid';
import { AiInsightsSection } from '@/components/dashboard/ai-insights-section';
import { HistoricalDataChart } from '@/components/dashboard/historical-data-chart';
import { ChatbotDialog } from '@/components/chatbot/chatbot-dialog';
import { Button } from '@/components/ui/button';
import { useAirQuality } from '@/contexts/air-quality-context';
import { MessageCircle, Loader2 } from 'lucide-react';
import { INITIAL_POLLUTANTS_FOR_CHART } from '@/lib/constants';
import { TopActionsBar } from '@/components/layout/top-actions-bar';


export default function DashboardPage() {
  const {
    currentData,
    historicalData,
    aiAnalysis,
    actionRecommendations,
    isLoadingReadings,
    isLoadingAnalysis,
    isLoadingRecommendations,
  } = useAirQuality();
  
  const [isChatbotOpen, setIsChatbotOpen] = React.useState(false);

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
          <AiInsightsSection
            analysis={aiAnalysis}
            recommendations={actionRecommendations}
            isLoadingAnalysis={isLoadingAnalysis}
            isLoadingRecommendations={isLoadingRecommendations}
          />
          <HistoricalDataChart
            data={historicalData}
            selectedPollutants={INITIAL_POLLUTANTS_FOR_CHART}
            isLoading={historicalData.length === 0}
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
