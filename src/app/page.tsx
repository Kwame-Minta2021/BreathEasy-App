"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AppHeader } from '@/components/layout/app-header';
import { CurrentReadingsGrid } from '@/components/dashboard/current-readings-grid';
import { AiInsightsSection } from '@/components/dashboard/ai-insights-section';
import { HistoricalDataChart } from '@/components/dashboard/historical-data-chart';
import { ChatbotDialog } from '@/components/chatbot/chatbot-dialog';
import { Button } from '@/components/ui/button';
import type { AirQualityReading, HistoricalAirQualityReading, Pollutant } from '@/types';
import { fetchAiAnalysis, fetchActionRecommendations } from '@/lib/actions';
import { MessageCircle, Loader2 } from 'lucide-react';
import type { AirQualityAnalysisInput } from '@/ai/flows/air-quality-analysis';
import type { ActionRecommendationsInput } from '@/ai/flows/action-recommendations';

const initialPollutantsForChart: Array<Pollutant['id']> = ['co', 'pm2_5', 'vocs'];

// Helper to generate mock data
const generateMockReading = (prev?: AirQualityReading): AirQualityReading => {
  const base = {
    co: prev ? prev.co + (Math.random() - 0.5) * 0.2 : 1.5 + Math.random() * 1, // 0.5 - 2.5 ppm
    vocs: prev ? prev.vocs + (Math.random() - 0.5) * 20 : 100 + Math.random() * 100, // 50 - 250 ppb
    ch4Lpg: prev ? prev.ch4Lpg + (Math.random() - 0.5) * 0.1 : 0.5 + Math.random() * 0.5, // 0.2 - 1.2 ppm
    pm1_0: prev ? prev.pm1_0 + (Math.random() - 0.5) * 2 : 10 + Math.random() * 10, // 5 - 25 µg/m³
    pm2_5: prev ? prev.pm2_5 + (Math.random() - 0.5) * 3 : 15 + Math.random() * 15, // 5 - 40 µg/m³
    pm10_0: prev ? prev.pm10_0 + (Math.random() - 0.5) * 5 : 20 + Math.random() * 20, // 10 - 50 µg/m³
  };
  // Ensure values are non-negative
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, Math.max(0, parseFloat(value.toFixed(1)))])) as AirQualityReading;
};


export default function DashboardPage() {
  const [currentData, setCurrentData] = useState<AirQualityReading | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalAirQualityReading[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [actionRecommendations, setActionRecommendations] = useState<string[] | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  
  const [isLoadingReadings, setIsLoadingReadings] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const updateAiData = useCallback(async (data: AirQualityReading) => {
    setIsLoadingAnalysis(true);
    setIsLoadingRecommendations(true);

    // Map to AI input types
    const analysisInput: AirQualityAnalysisInput = {
      co: data.co,
      vocs: data.vocs,
      ch4Lpg: data.ch4Lpg,
      pm10: data.pm1_0, // PM1.0 is pm10 for this flow
      pm25: data.pm2_5,
      pm100: data.pm10_0, // PM10 is pm100 for this flow
    };
    
    const recommendationsInput: ActionRecommendationsInput = {
      co: data.co,
      vocs: data.vocs,
      ch4Lpg: data.ch4Lpg,
      pm1_0: data.pm1_0,
      pm2_5: data.pm2_5,
      pm10: data.pm10_0,
    };

    try {
      const [analysisResult, recommendationsResult] = await Promise.all([
        fetchAiAnalysis(analysisInput),
        fetchActionRecommendations(recommendationsInput),
      ]);
      setAiAnalysis(analysisResult.summary);
      setActionRecommendations(recommendationsResult.recommendations);
    } catch (error) {
      console.error("Error fetching AI data:", error);
      setAiAnalysis("Failed to load AI analysis.");
      setActionRecommendations(["Failed to load recommendations."]);
    } finally {
      setIsLoadingAnalysis(false);
      setIsLoadingRecommendations(false);
    }
  }, []);


  useEffect(() => {
    // Initial data load
    const initialReading = generateMockReading();
    setCurrentData(initialReading);
    setHistoricalData([{ ...initialReading, timestamp: new Date() }]);
    updateAiData(initialReading);
    setIsLoadingReadings(false);

    // Simulate real-time updates
    const intervalId = setInterval(() => {
      setCurrentData(prevData => {
        const newData = generateMockReading(prevData || undefined);
        setHistoricalData(prevHist => {
          const newHist = [...prevHist, { ...newData, timestamp: new Date() }];
          return newHist.slice(-30); // Keep last 30 readings
        });
        updateAiData(newData);
        return newData;
      });
    }, 15000); // Update every 15 seconds for demo, can be faster

    return () => clearInterval(intervalId);
  }, [updateAiData]);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8 space-y-8">
        {isLoadingReadings && !currentData ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading initial air quality data...</p>
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
              selectedPollutants={initialPollutantsForChart}
              isLoading={historicalData.length === 0}
            />
          </>
        )}
      </main>
      <Button
        variant="default"
        size="lg"
        className="fixed bottom-6 right-6 rounded-full shadow-xl p-4 h-16 w-16"
        onClick={() => setIsChatbotOpen(true)}
        aria-label="Open AI Chatbot"
      >
        <MessageCircle className="h-8 w-8" />
      </Button>
      <ChatbotDialog isOpen={isChatbotOpen} onOpenChange={setIsChatbotOpen} />
       <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} BreathEasy. All rights reserved.
      </footer>
    </div>
  );
}
