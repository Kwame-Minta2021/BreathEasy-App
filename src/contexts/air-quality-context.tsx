
"use client";

import type { AirQualityReading, HistoricalAirQualityReading, UserThresholds, AppNotification } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { fetchAiAnalysis, fetchActionRecommendations } from '@/lib/actions';
import type { AirQualityAnalysisInput } from '@/ai/flows/air-quality-analysis';
import type { ActionRecommendationsInput } from '@/ai/flows/action-recommendations';
import { POLLUTANTS_LIST } from '@/lib/constants';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { database } from '@/lib/firebase';
import { ref, onValue, off, set as firebaseSet } from 'firebase/database';

const MAX_HISTORICAL_READINGS = 500;
const SENSOR_DATA_PATH = 'sensor_readings'; // Assumed path for sensor data
const USER_THRESHOLDS_PATH = 'user_settings/thresholds'; // Path for user thresholds

// Firebase data structure for sensor readings (raw from DB)
interface FirebaseSensorReading {
  CH4_LPG_ppm?: number;
  CO_ppm?: number;
  PM10_ug_m3?: number;
  PM1_0_ug_m3?: number;
  PM2_5_ug_m3?: number;
  VOCs_ppm?: number;
  // Add any other fields that might come from Firebase, even if not used directly
  [key: string]: any; 
}


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

  const mapFirebaseToAppReading = (fbReading: FirebaseSensorReading): AirQualityReading => {
    return {
      co: fbReading.CO_ppm ?? 0,
      vocs: (fbReading.VOCs_ppm ?? 0) * 1000, // Convert ppm to ppb
      ch4Lpg: fbReading.CH4_LPG_ppm ?? 0,
      pm1_0: fbReading.PM1_0_ug_m3 ?? 0,
      pm2_5: fbReading.PM2_5_ug_m3 ?? 0,
      pm10_0: fbReading.PM10_ug_m3 ?? 0,
    };
  };

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
      if (thresholdValue !== undefined && thresholdValue !== Number.MAX_SAFE_INTEGER && currentValue > thresholdValue) {
        const existingNotification = notifications.find(
          n => n.pollutantId === pollutant.id && (new Date().getTime() - n.timestamp.getTime()) < 5 * 60 * 1000 // Check if a notification for this pollutant was sent in the last 5 mins
        );
        if (!existingNotification) {
          newNotifications.push({
            id: `${pollutant.id}-${Date.now()}`,
            pollutantId: pollutant.id,
            pollutantName: pollutant.name,
            value: currentValue,
            threshold: thresholdValue,
            timestamp: new Date(),
            message: `${pollutant.name} level (${currentValue.toFixed(1)} ${pollutant.unit}) exceeded threshold (${thresholdValue} ${pollutant.unit}).`
          });
        }
      }
    });
    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 10)); // Keep max 10 notifications
    }
  }, [thresholds, notifications]);


  useEffect(() => {
    const sensorDataRef = ref(database, SENSOR_DATA_PATH);
    
    const handleNewData = (snapshot: any) => {
      const fbData = snapshot.val() as FirebaseSensorReading | null;
      if (fbData) {
        const appData = mapFirebaseToAppReading(fbData);
        setCurrentData(appData);
        setHistoricalData(prevHist => {
          const newHistEntry: HistoricalAirQualityReading = { ...appData, timestamp: new Date() };
          const updatedHist = [ ...prevHist, newHistEntry];
          return updatedHist.slice(-MAX_HISTORICAL_READINGS);
        });
        
        if (isLoadingReadings) { // Only call AI data on first load or significant changes
            updateAiData(appData);
        } else { // For subsequent updates, perhaps a less frequent AI update or based on thresholds
            // Check if any value significantly changed to re-trigger AI update
            const significantChange = Object.keys(appData).some(key => {
                const currentVal = appData[key as keyof AirQualityReading];
                const previousVal = currentData ? currentData[key as keyof AirQualityReading] : null;
                if (typeof currentVal === 'number' && typeof previousVal === 'number') {
                    return Math.abs(currentVal - previousVal) / previousVal > 0.1; // 10% change
                }
                return false;
            });
            if(significantChange || !aiAnalysis) { // Or if AI analysis is null
                updateAiData(appData);
            }
        }
        
        checkForNotifications(appData);
        setIsLoadingReadings(false);
      } else {
        // Handle case where data is null (e.g. path doesn't exist or cleared)
        setIsLoadingReadings(false); 
        // Optionally set currentData to null or default values
        // setCurrentData(null); 
        // setHistoricalData([]);
      }
    };

    onValue(sensorDataRef, handleNewData, (error) => {
      console.error("Firebase sensor data read failed:", error);
      setIsLoadingReadings(false);
    });

    // Listener for user thresholds
    const thresholdsRef = ref(database, USER_THRESHOLDS_PATH);
    onValue(thresholdsRef, (snapshot) => {
        const savedThresholds = snapshot.val() as UserThresholds | null;
        if (savedThresholds) {
            setThresholds(savedThresholds);
        } else {
            // Initialize with default "unset" thresholds if nothing in DB
            const defaultThresholds: UserThresholds = {};
            POLLUTANTS_LIST.forEach(p => {
                defaultThresholds[p.id] = Number.MAX_SAFE_INTEGER;
            });
            setThresholds(defaultThresholds);
        }
    }, (error) => {
        console.error("Firebase thresholds read failed:", error);
        // Keep local/default thresholds on error
    });


    return () => {
      off(sensorDataRef, 'value', handleNewData);
      off(thresholdsRef, 'value');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateAiData, checkForNotifications, currentData, aiAnalysis]); // currentData & aiAnalysis added to dependencies for AI update logic


  const updateThreshold = (pollutantId: keyof AirQualityReading, value: number) => {
    const newThresholds = { ...thresholds, [pollutantId]: value === null || isNaN(value) ? Number.MAX_SAFE_INTEGER : value };
    setThresholds(newThresholds);
    firebaseSet(ref(database, USER_THRESHOLDS_PATH), newThresholds)
      .catch(error => console.error("Error saving thresholds to Firebase:", error));
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
