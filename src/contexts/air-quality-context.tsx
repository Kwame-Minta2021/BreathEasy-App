
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
const SENSOR_DATA_PATH = 'sensorData'; // Path for sensor data, ensures this matches Firebase structure.
const USER_THRESHOLDS_PATH = 'user_settings/thresholds'; // Path for user thresholds

interface FirebaseSensorReading {
  CH4_LPG_ppm?: number;
  CO_ppm?: number;
  PM10_ug_m3?: number;
  PM1_0_ug_m3?: number;
  PM2_5_ug_m3?: number;
  VOCs_ppm?: number; // Firebase sends VOCs in ppm
  timestamp?: number; // Unix timestamp
  WiFi_SSID?: string;
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
  const notificationsRef = useRef(notifications);
  const isLoadingAnalysisRef = useRef(isLoadingAnalysis);
  const isLoadingRecommendationsRef = useRef(isLoadingRecommendations);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    isLoadingAnalysisRef.current = isLoadingAnalysis;
  }, [isLoadingAnalysis]);

  useEffect(() => {
    isLoadingRecommendationsRef.current = isLoadingRecommendations;
  }, [isLoadingRecommendations]);

  const mapFirebaseToAppReading = useCallback((fbReading: FirebaseSensorReading): AirQualityReading => {
    return {
      co: fbReading.CO_ppm ?? 0,
      vocs: (fbReading.VOCs_ppm ?? 0) * 1000, // Convert ppm to ppb
      ch4Lpg: fbReading.CH4_LPG_ppm ?? 0,
      pm1_0: fbReading.PM1_0_ug_m3 ?? 0,
      pm2_5: fbReading.PM2_5_ug_m3 ?? 0,
      pm10_0: fbReading.PM10_ug_m3 ?? 0,
    };
  }, []);

  const checkForNotifications = useCallback((newData: AirQualityReading) => {
    const newNotificationsToAdd: AppNotification[] = [];
    POLLUTANTS_LIST.forEach(pollutant => {
      const thresholdValue = thresholds[pollutant.id];
      const currentValue = newData[pollutant.id];
      if (thresholdValue !== undefined && thresholdValue !== Number.MAX_SAFE_INTEGER && currentValue > thresholdValue) {
        const existingNotification = notificationsRef.current.find(
          n => n.pollutantId === pollutant.id && (new Date().getTime() - n.timestamp.getTime()) < 5 * 60 * 1000
        );
        if (!existingNotification) {
          newNotificationsToAdd.push({
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
    if (newNotificationsToAdd.length > 0) {
      setNotifications(prev => [...newNotificationsToAdd, ...prev].slice(0, 10));
    }
  }, [thresholds]);

  const updateAiData = useCallback(async (data: AirQualityReading | null) => {
    if (!data || isLoadingAnalysisRef.current || isLoadingRecommendationsRef.current) return;

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
  }, []);

  useEffect(() => {
    const sensorDataRefRealtime = ref(database, SENSOR_DATA_PATH);
    
    // console.log(`[CONTEXT_INIT - ${new Date().toLocaleTimeString()}] Attaching Firebase listener to ${SENSOR_DATA_PATH}.`);
    if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(true);
        // console.log(`[CONTEXT_INIT - ${new Date().toLocaleTimeString()}] isLoadingReadings set to true.`);
    }
    
    const handleData = (snapshot: DataSnapshot) => {
      // !!! --- UNCOMMENT THE LINES BELOW TO DEBUG --- !!!
      // console.log(`[FB_DATA_RECEIVED - ${new Date().toLocaleTimeString()}] Snapshot received for path: ${SENSOR_DATA_PATH}`);
      // console.log(`[FB_DATA_RAW - ${new Date().toLocaleTimeString()}] Raw snapshot.val():`, JSON.stringify(snapshot.val(), null, 2));
      
      if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(false); 
        initialSensorLoadDoneRef.current = true;
        // console.log(`[FB_DATA_PROCESSED - ${new Date().toLocaleTimeString()}] Initial sensor load done. isLoadingReadings set to false.`);
      }

      const fbData = snapshot.val() as FirebaseSensorReading | null;
      // console.log(`[FB_DATA_PARSED - ${new Date().toLocaleTimeString()}] Parsed fbData (snapshot.val()):`, fbData);

      if (fbData && typeof fbData === 'object' && Object.keys(fbData).length > 0) {
        // Check if common pollutant keys are present
        const hasPollutantKeys = ['CO_ppm', 'VOCs_ppm', 'PM2_5_ug_m3'].some(key => key in fbData);
        if (!hasPollutantKeys) {
            // console.warn(`[FB_DATA_WARNING - ${new Date().toLocaleTimeString()}] Received data object does not seem to contain expected pollutant keys. Path: ${SENSOR_DATA_PATH}. Data:`, fbData);
            // This might happen if SENSOR_DATA_PATH points to a parent node containing multiple reading objects
            // instead of a single reading object.
             setCurrentData(null); // Or handle as an error/empty state
             return; // Stop further processing for this snapshot
        }

        const appData = mapFirebaseToAppReading(fbData);
        // console.log(`[FB_DATA_MAPPED - ${new Date().toLocaleTimeString()}] Mapped appData:`, appData);

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
        } else if (currentData === null && appData !== null) {
            shouldUpdateAI = true;
        } else if (appData !== null) {
            const significantChange = Object.keys(appData).some(key => {
                const currentVal = appData[key as keyof AirQualityReading];
                const previousVal = lastProcessedForAI?.[key as keyof AirQualityReading];
                if (typeof currentVal === 'number' && typeof previousVal === 'number') {
                    if (previousVal === 0 && currentVal !== 0) return true;
                    if (previousVal === 0 && currentVal === 0) return false; 
                    return Math.abs(currentVal - previousVal) / previousVal > 0.1; // 10% change
                }
                return false;
            });
            if (significantChange) {
                shouldUpdateAI = true;
            }
        }
        
        if (shouldUpdateAI) {
          // console.log(`[AI_UPDATE_TRIGGER - ${new Date().toLocaleTimeString()}] Triggering AI update.`);
          updateAiData(appData);
        }
      } else {
        // console.log(`[FB_DATA_EMPTY - ${new Date().toLocaleTimeString()}] fbData is null or empty for path: ${SENSOR_DATA_PATH}. Setting currentData to null.`);
        setCurrentData(null);
        setLastProcessedForAI(null); 
      }
    };

    const handleError = (error: Error) => {
      console.error(`[FB_ERROR - ${new Date().toLocaleTimeString()}] Firebase data read failed for path ${SENSOR_DATA_PATH}:`, error);
      if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(false);
        initialSensorLoadDoneRef.current = true;
      }
      setCurrentData(null);
      setLastProcessedForAI(null);
    };

    onValue(sensorDataRefRealtime, handleData, handleError);

    return () => {
      // console.log(`[CONTEXT_CLEANUP - ${new Date().toLocaleTimeString()}] Detaching Firebase listener from ${SENSOR_DATA_PATH}`);
      off(sensorDataRefRealtime, 'value', handleData);
      initialSensorLoadDoneRef.current = false;
    };
  }, [mapFirebaseToAppReading, checkForNotifications, updateAiData, currentData]); // Added currentData to dependencies of sensor listener


  useEffect(() => {
    const thresholdsPathRef = ref(database, USER_THRESHOLDS_PATH);
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

    onValue(thresholdsPathRef, handleThresholdData, handleThresholdError);

    return () => {
      off(thresholdsPathRef, 'value', handleThresholdData);
    };
  }, []); 

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (currentData && !isLoadingAnalysisRef.current && !isLoadingRecommendationsRef.current) {
        updateAiData(currentData);
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [currentData, updateAiData]);


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

    