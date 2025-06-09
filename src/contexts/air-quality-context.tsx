
"use client";

import type { AirQualityReading, HistoricalAirQualityReading, UserThresholds, AppNotification, Pollutant } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetchAiAnalysis, fetchActionRecommendations } from '@/lib/actions';
import type { AirQualityAnalysisInput } from '@/ai/flows/air-quality-analysis';
import type { ActionRecommendationsInput } from '@/ai/flows/action-recommendations';
import { POLLING_INTERVAL_MS, POLLUTANTS_LIST } from '@/lib/constants';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

// Helper to generate mock data
const generateMockReading = (prev?: AirQualityReading): AirQualityReading => {
  const base = {
    co: prev ? prev.co + (Math.random() - 0.5) * 0.2 : 1.5 + Math.random() * 1,
    vocs: prev ? prev.vocs + (Math.random() - 0.5) * 20 : 100 + Math.random() * 100,
    ch4Lpg: prev ? prev.ch4Lpg + (Math.random() - 0.5) * 0.1 : 0.5 + Math.random() * 0.5,
    pm1_0: prev ? prev.pm1_0 + (Math.random() - 0.5) * 2 : 10 + Math.random() * 10,
    pm2_5: prev ? prev.pm2_5 + (Math.random() - 0.5) * 3 : 15 + Math.random() * 15,
    pm10_0: prev ? prev.pm10_0 + (Math.random() - 0.5) * 5 : 20 + Math.random() * 20,
  };
  return Object.fromEntries(Object.entries(base).map(([key, value]) => [key, Math.max(0, parseFloat(value.toFixed(1)))])) as AirQualityReading;
};

const MAX_HISTORICAL_READINGS = 500; // Cap for stored historical readings
const NUM_INITIAL_MOCK_READINGS = 300; // Number of initial readings to generate

interface AirQualityContextType {
  currentData: AirQualityReading | null;
  historicalData: HistoricalAirQualityReading[];
  aiAnalysis: string | null;
  actionRecommendations: string[] | null;
  isLoadingReadings: boolean;
  isLoadingAnalysis: boolean;
  isLoadingRecommendations: boolean;
  thresholds: UserThresholds;
  notifications: AppNotification[];
  updateThreshold: (pollutantId: keyof AirQualityReading, value: number) => void;
  clearNotification: (notificationId: string) => void;
  fetchInitialData: () => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
}

const AirQualityContext = createContext<AirQualityContextType | undefined>(undefined);

export const AirQualityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentData, setCurrentData] = useState<AirQualityReading | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalAirQualityReading[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [actionRecommendations, setActionRecommendations] = useState<string[] | null>(null);
  const [isLoadingReadings, setIsLoadingReadings] = useState(true);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [thresholds, setThresholds] = useState<UserThresholds>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });

  const updateAiData = useCallback(async (data: AirQualityReading) => {
    setIsLoadingAnalysis(true);
    setIsLoadingRecommendations(true);
    const analysisInput: AirQualityAnalysisInput = {
      co: data.co,
      vocs: data.vocs,
      ch4Lpg: data.ch4Lpg,
      pm1_0: data.pm1_0,
      pm2_5: data.pm2_5,
      pm10_0: data.pm10_0,
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
  
  const checkForNotifications = useCallback((newData: AirQualityReading) => {
    const newNotifications: AppNotification[] = [];
    POLLUTANTS_LIST.forEach(pollutant => {
      const thresholdValue = thresholds[pollutant.id];
      const currentValue = newData[pollutant.id];
      if (thresholdValue !== undefined && currentValue > thresholdValue) {
        const existingNotification = notifications.find(
          n => n.pollutantId === pollutant.id && (new Date().getTime() - n.timestamp.getTime()) < 5 * 60 * 1000
        );
        if (!existingNotification) {
          newNotifications.push({
            id: `${pollutant.id}-${Date.now()}`,
            pollutantId: pollutant.id,
            pollutantName: pollutant.name,
            value: currentValue,
            threshold: thresholdValue,
            timestamp: new Date(),
            message: `${pollutant.name} level (${currentValue} ${pollutant.unit}) has exceeded the threshold of ${thresholdValue} ${pollutant.unit}.`
          });
        }
      }
    });
    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 10));
    }
  }, [thresholds, notifications]);

  const fetchInitialData = useCallback(() => {
    setIsLoadingReadings(true);
    const initialMockReadings: HistoricalAirQualityReading[] = [];
    let iterDate = dateRange?.from ? new Date(dateRange.from) : addDays(new Date(), -7);
    let lastMockReading: AirQualityReading | undefined = undefined;

    for (let i = 0; i < NUM_INITIAL_MOCK_READINGS; i++) {
      const mockTimestamp = new Date(iterDate.getTime() + i * POLLING_INTERVAL_MS);
      if (mockTimestamp > new Date()) break; 

      lastMockReading = generateMockReading(lastMockReading);
      initialMockReadings.push({ ...lastMockReading, timestamp: mockTimestamp });
    }
    
    if (initialMockReadings.length > 0) {
      const latestReading = initialMockReadings[initialMockReadings.length - 1];
      setCurrentData(latestReading);
      setHistoricalData(initialMockReadings.slice(-MAX_HISTORICAL_READINGS));
      updateAiData(latestReading);
      checkForNotifications(latestReading);
    } else {
      // Fallback if no initial readings were generated
      const firstReading = generateMockReading();
      const now = new Date();
      setCurrentData(firstReading);
      setHistoricalData([{ ...firstReading, timestamp: now }]);
      updateAiData(firstReading);
      checkForNotifications(firstReading);
    }
    setIsLoadingReadings(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateAiData, checkForNotifications]); // dateRange is not included to prevent re-fetching initial on range change

  const fetchData = useCallback(() => {
    // This function is for polling new data
    setCurrentData(prevData => {
      const newData = generateMockReading(prevData || undefined);
      setHistoricalData(prevHist => {
        const newHist = [...prevHist, { ...newData, timestamp: new Date() }];
        return newHist.slice(-MAX_HISTORICAL_READINGS);
      });
      updateAiData(newData);
      checkForNotifications(newData);
      return newData;
    });
    setIsLoadingReadings(false); 
  }, [updateAiData, checkForNotifications]);


  useEffect(() => {
    fetchInitialData();
    const intervalId = setInterval(fetchData, POLLING_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchData, fetchInitialData]);

  const updateThreshold = (pollutantId: keyof AirQualityReading, value: number) => {
    setThresholds(prev => ({ ...prev, [pollutantId]: value }));
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <AirQualityContext.Provider value={{
      currentData,
      historicalData,
      aiAnalysis,
      actionRecommendations,
      isLoadingReadings,
      isLoadingAnalysis,
      isLoadingRecommendations,
      thresholds,
      notifications,
      updateThreshold,
      clearNotification,
      fetchInitialData,
      dateRange,
      setDateRange,
    }}>
      {children}
    </AirQualityContext.Provider>
  );
};

export const useAirQuality = (): AirQualityContextType => {
  const context = useContext(AirQualityContext);
  if (context === undefined) {
    throw new Error('useAirQuality must be used within an AirQualityProvider');
  }
  return context;
};

