
"use client";

import type { AirQualityReading, HistoricalAirQualityReading, UserThresholds, AppNotification } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { fetchAiAnalysis, fetchActionRecommendations } from '@/lib/actions';
import type { AirQualityAnalysisInput } from '@/ai/flows/air-quality-analysis';
import type { ActionRecommendationsInput } from '@/ai/flows/action-recommendations';
import { POLLUTANTS_LIST, POLLING_INTERVAL_MS } from '@/lib/constants';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { database } from '@/lib/firebase';
import { ref, onValue, off, set as firebaseSet, DataSnapshot } from 'firebase/database';

const MAX_HISTORICAL_READINGS = 500;
const SENSOR_DATA_PATH = 'sensorData'; // Path for sensor data
const USER_THRESHOLDS_PATH = 'user_settings/thresholds'; // Path for user thresholds

interface FirebaseSensorReading {
  CH4_LPG_ppm?: number;
  CO_ppm?: number;
  PM10_ug_m3?: number;
  PM1_0_ug_m3?: number;
  PM2_5_ug_m3?: number;
  VOCs_ppm?: number; // Firebase sends VOCs in ppm
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
  const [lastProcessedForAI, setLastProcessedForAI] = useState<AirQualityReading | null>(null);
  const initialSensorLoadDoneRef = useRef(false);


  const mapFirebaseToAppReading = useCallback((fbReading: FirebaseSensorReading): AirQualityReading => {
    return {
      co: fbReading.CO_ppm ?? 0,
      vocs: (fbReading.VOCs_ppm ?? 0) * 1000, // Convert ppm to ppb for app consistency
      ch4Lpg: fbReading.CH4_LPG_ppm ?? 0,
      pm1_0: fbReading.PM1_0_ug_m3 ?? 0,
      pm2_5: fbReading.PM2_5_ug_m3 ?? 0,
      pm10_0: fbReading.PM10_ug_m3 ?? 0,
    };
  }, []);

  const updateAiData = useCallback(async (data: AirQualityReading) => {
    if (isLoadingAnalysis || isLoadingRecommendations) return;

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
      setLastProcessedForAI(data);
    } catch (error) {
      console.error("Error fetching AI data:", error);
      setAiAnalysis("Failed to load AI analysis.");
      setActionRecommendations(["Failed to load recommendations."]);
    } finally {
      setIsLoadingAnalysis(false);
      setIsLoadingRecommendations(false);
    }
  }, [isLoadingAnalysis, isLoadingRecommendations]);

  const checkForNotifications = useCallback((newData: AirQualityReading) => {
    const newNotifications: AppNotification[] = [];
    POLLUTANTS_LIST.forEach(pollutant => {
      const thresholdValue = thresholds[pollutant.id];
      const currentValue = newData[pollutant.id];
      if (thresholdValue !== undefined && thresholdValue !== Number.MAX_SAFE_INTEGER && currentValue > thresholdValue) {
        const existingNotification = notifications.find(
          n => n.pollutantId === pollutant.id && (new Date().getTime() - n.timestamp.getTime()) < 5 * 60 * 1000 // 5 min cooldown
        );
        if (!existingNotification) {
          newNotifications.push({
            id: `${pollutant.id}-${Date.now()}`,
            pollutantId: pollutant.id,
            pollutantName: pollutant.name,
            value: currentValue,
            threshold: thresholdValue,
            timestamp: new Date(),
            message: `${pollutant.name} level (${currentValue.toFixed(1)} ${pollutant.unit}) exceeded threshold (${thresholdValue.toFixed(1)} ${pollutant.unit}).`
          });
        }
      }
    });
    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev].slice(0, 10)); // Keep last 10
    }
  }, [thresholds, notifications]);


  // Effect for fetching sensor data from Firebase
  useEffect(() => {
    const sensorDataRefRealtime = ref(database, SENSOR_DATA_PATH);
    
    // Set loading to true only if initial load hasn't happened.
    // This ensures that if dependencies of this effect cause re-runs,
    // we don't flicker the loading state if data has already been loaded once.
    if (!initialSensorLoadDoneRef.current) {
      setIsLoadingReadings(true);
    }

    const handleData = (snapshot: DataSnapshot) => {
      // Uncomment for debugging:
      // console.log(`[${new Date().toLocaleTimeString()}] Firebase snapshot for ${SENSOR_DATA_PATH}:`, snapshot.val());
      
      if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(false); // Mark initial load as done
        initialSensorLoadDoneRef.current = true;
      }

      const fbData = snapshot.val() as FirebaseSensorReading | null;
      // Uncomment for debugging:
      // console.log(`[${new Date().toLocaleTimeString()}] Parsed fbData for ${SENSOR_DATA_PATH}:`, fbData);

      if (fbData) {
        const appData = mapFirebaseToAppReading(fbData);
        // Uncomment for debugging:
        // console.log(`[${new Date().toLocaleTimeString()}] Mapped appData for ${SENSOR_DATA_PATH}:`, appData);

        setCurrentData(appData);
        setHistoricalData(prevHist => {
          const newHistEntry: HistoricalAirQualityReading = { ...appData, timestamp: new Date() };
          const updatedHist = [ ...prevHist, newHistEntry];
          return updatedHist.slice(-MAX_HISTORICAL_READINGS);
        });
        
        checkForNotifications(appData);

        let shouldUpdateAI = false;
        if (!lastProcessedForAI) {
            shouldUpdateAI = true;
        } else {
            const significantChange = Object.keys(appData).some(key => {
                const currentVal = appData[key as keyof AirQualityReading];
                const previousVal = lastProcessedForAI[key as keyof AirQualityReading];
                if (typeof currentVal === 'number' && typeof previousVal === 'number') {
                    if (previousVal === 0 && currentVal !== 0) return true;
                    if (previousVal === 0 && currentVal === 0) return false; // Avoid division by zero
                    return Math.abs(currentVal - previousVal) / previousVal > 0.1; // 10% change
                }
                return false;
            });
            if (significantChange) {
                shouldUpdateAI = true;
            }
        }
        
        if (shouldUpdateAI) {
          updateAiData(appData);
        }
      } else {
        // Uncomment for debugging:
        // console.log(`[${new Date().toLocaleTimeString()}] fbData is null for ${SENSOR_DATA_PATH}. Setting currentData to null.`);
        setCurrentData(null);
        setLastProcessedForAI(null); // Reset so AI updates on next valid data
      }
    };

    const handleError = (error: Error) => {
      console.error(`Firebase ${SENSOR_DATA_PATH} data read failed:`, error);
      if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(false); // Mark initial load attempt as done (even if error)
        initialSensorLoadDoneRef.current = true;
      }
      setCurrentData(null);
      setLastProcessedForAI(null);
    };

    // console.log(`[${new Date().toLocaleTimeString()}] Attaching Firebase listener to ${SENSOR_DATA_PATH}`);
    onValue(sensorDataRefRealtime, handleData, handleError);

    return () => {
      // console.log(`[${new Date().toLocaleTimeString()}] Detaching Firebase listener from ${SENSOR_DATA_PATH}`);
      off(sensorDataRefRealtime, 'value', handleData);
      // initialSensorLoadDoneRef.current = false; // Reset if component unmounts fully, allowing re-init of loading state
    };
  // These dependencies ensure the listener is re-attached if these stable callback functions change
  // (which happens if *their* own dependencies change, e.g., thresholds for checkForNotifications).
  }, [mapFirebaseToAppReading, checkForNotifications, updateAiData]);

  // Effect for fetching user thresholds from Firebase
  useEffect(() => {
    const thresholdsRef = ref(database, USER_THRESHOLDS_PATH);
    const handleThresholdData = (snapshot: DataSnapshot) => {
        const savedThresholds = snapshot.val() as UserThresholds | null;
        if (savedThresholds) {
            setThresholds(savedThresholds);
        } else {
            const defaultThresholdsInit: UserThresholds = {};
            POLLUTANTS_LIST.forEach(p => {
                defaultThresholdsInit[p.id] = Number.MAX_SAFE_INTEGER;
            });
            setThresholds(defaultThresholdsInit);
        }
    };
    const handleThresholdError = (error: Error) => {
        console.error(`Firebase ${USER_THRESHOLDS_PATH} data read failed:`, error);
        const defaultThresholdsInit: UserThresholds = {};
        POLLUTANTS_LIST.forEach(p => {
            defaultThresholdsInit[p.id] = Number.MAX_SAFE_INTEGER;
        });
        setThresholds(defaultThresholdsInit);
    };

    onValue(thresholdsRef, handleThresholdData, handleThresholdError);

    return () => {
      off(thresholdsRef, 'value', handleThresholdData);
    };
  }, []); // Runs once on mount

  // Effect for periodic AI update
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (currentData && !isLoadingAnalysis && !isLoadingRecommendations) {
        // console.log("Periodic AI update triggered by interval.");
        updateAiData(currentData);
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [currentData, updateAiData, isLoadingAnalysis, isLoadingRecommendations]);


  const updateThreshold = (pollutantId: keyof AirQualityReading, value: number) => {
    const newThresholds = { ...thresholds, [pollutantId]: value === null || isNaN(value) ? Number.MAX_SAFE_INTEGER : value };
    setThresholds(newThresholds);
    firebaseSet(ref(database, USER_THRESHOLDS_PATH), newThresholds)
      .then(() => { /* console.log("Thresholds saved to Firebase.") */ })
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
