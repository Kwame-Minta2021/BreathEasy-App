
"use client";

import type { AirQualityReading, HistoricalAirQualityReading, UserThresholds, AppNotification, Pollutant } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetchAiAnalysis, fetchActionRecommendations } from '@/lib/actions';
import type { AirQualityAnalysisInput } from '@/ai/flows/air-quality-analysis';
import type { ActionRecommendationsInput } from '@/ai/flows/action-recommendations';
import { POLLING_INTERVAL_MS, POLLUTANTS_LIST } from '@/lib/constants';

// Helper to generate mock data (copied from original page.tsx and adapted)
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
  const [thresholds, setThresholds] = useState<UserThresholds>({}); // Load from Firebase/localStorage eventually
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
        // Check if a similar notification already exists and is recent
        const existingNotification = notifications.find(
          n => n.pollutantId === pollutant.id && (new Date().getTime() - n.timestamp.getTime()) < 5 * 60 * 1000 // 5 min window
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
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 10)); // Keep last 10 notifications
    }
  }, [thresholds, notifications]);

  const fetchData = useCallback(() => {
    setCurrentData(prevData => {
      const newData = generateMockReading(prevData || undefined);
      setHistoricalData(prevHist => {
        const newHist = [...prevHist, { ...newData, timestamp: new Date() }];
        return newHist.slice(-60); // Keep last 60 readings for 2-min interval (2 hours of data)
      });
      updateAiData(newData);
      checkForNotifications(newData); // Check for notifications with new data
      return newData;
    });
    setIsLoadingReadings(false);
  }, [updateAiData, checkForNotifications]);

  const fetchInitialData = useCallback(() => {
    setIsLoadingReadings(true);
    const initialReading = generateMockReading();
    setCurrentData(initialReading);
    setHistoricalData([{ ...initialReading, timestamp: new Date() }]);
    updateAiData(initialReading);
    checkForNotifications(initialReading);
    setIsLoadingReadings(false);
  }, [updateAiData, checkForNotifications]);


  useEffect(() => {
    fetchInitialData(); // Initial data load
    const intervalId = setInterval(fetchData, POLLING_INTERVAL_MS); // Poll data every 2 minutes
    return () => clearInterval(intervalId);
  }, [fetchData, fetchInitialData]);

  const updateThreshold = (pollutantId: keyof AirQualityReading, value: number) => {
    setThresholds(prev => ({ ...prev, [pollutantId]: value }));
    // Here you would also save to Firebase/localStorage
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
