
"use client";

import type { AirQualityReading, HistoricalAirQualityReading, UserThresholds, AppNotification, FirebaseSensorReading } from '@/types';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { fetchAiAnalysis, fetchActionRecommendations } from '@/lib/actions';
import type { AirQualityAnalysisInput } from '@/ai/flows/air-quality-analysis';
import type { ActionRecommendationsInput } from '@/ai/flows/action-recommendations';
import { POLLUTANTS_LIST, POLLING_INTERVAL_MS } from '@/lib/constants';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { database } from '@/lib/firebase';
import { ref, onValue, off, set as firebaseSet, DataSnapshot, query, orderByKey, limitToLast } from 'firebase/database';

const MAX_HISTORICAL_READINGS = 500;
const SENSOR_DATA_PATH = 'sensorData';
const USER_THRESHOLDS_PATH = 'user_settings/thresholds';

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
    // !!! --- UNCOMMENT THE LINES BELOW TO DEBUG DATA MAPPING --- !!!
    // console.log(`[MAP_INPUT - ${new Date().toLocaleTimeString()}] mapFirebaseToAppReading input:`, fbReading);
    const mapped = {
      co: fbReading.CO_ppm ?? 0,
      vocs: (fbReading.VOCs_ppm ?? 0) * 1000, // Convert ppm to ppb
      ch4Lpg: fbReading.CH4_LPG_ppm ?? 0,
      pm1_0: fbReading.PM1_0_ug_m3 ?? 0,
      pm2_5: fbReading.PM2_5_ug_m3 ?? 0,
      pm10_0: fbReading.PM10_ug_m3 ?? 0,
    };
    // console.log(`[MAP_OUTPUT - ${new Date().toLocaleTimeString()}] mapFirebaseToAppReading output:`, mapped);
    return mapped;
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
  }, [thresholds]); // thresholds is a dependency

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
      // console.error("Error fetching AI data:", error);
      setAiAnalysis("Failed to load AI analysis.");
      setActionRecommendations(["Failed to load recommendations."]);
    } finally {
      setIsLoadingAnalysis(false);
      setIsLoadingRecommendations(false);
    }
  }, []); // Dependencies: isLoadingAnalysisRef, isLoadingRecommendationsRef are refs, their change doesn't re-create callback

  useEffect(() => {
    const sensorDataNodeRef = ref(database, SENSOR_DATA_PATH);
    // Query for the latest entry by ordering by key and taking the last one.
    // This assumes keys are sortable in a way that "last" means "latest".
    // For timestamp-based keys like "1749466370", this should work.
    const sensorDataQuery = query(sensorDataNodeRef, orderByKey(), limitToLast(1));
    
    // !!! --- UNCOMMENT THE LINE BELOW TO DEBUG --- !!!
    // console.log(`[CONTEXT_INIT - ${new Date().toLocaleTimeString()}] Attaching Firebase listener to query for latest reading at ${SENSOR_DATA_PATH}.`);
    
    if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(true);
        // console.log(`[CONTEXT_INIT - ${new Date().toLocaleTimeString()}] isLoadingReadings set to true.`);
    }
    
    const handleData = (snapshot: DataSnapshot) => {
      // !!! --- UNCOMMENT THE LINES BELOW TO DEBUG --- !!!
      // console.log(`[FB_DATA_RECEIVED - ${new Date().toLocaleTimeString()}] Snapshot received for query on path: ${SENSOR_DATA_PATH}`);
      // console.log(`[FB_DATA_RAW - ${new Date().toLocaleTimeString()}] Raw snapshot.val():`, JSON.stringify(snapshot.val(), null, 2));
      
      if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(false); 
        initialSensorLoadDoneRef.current = true;
        // console.log(`[FB_DATA_PROCESSED - ${new Date().toLocaleTimeString()}] Initial sensor load done. isLoadingReadings set to false.`);
      }

      let fbData: FirebaseSensorReading | null = null;
      // When using limitToLast(1), the snapshot contains the parent node with only one child.
      // We need to iterate to get that child.
      if (snapshot.exists() && snapshot.hasChildren()) {
        snapshot.forEach(childSnapshot => { // This will only iterate once for limitToLast(1)
          fbData = childSnapshot.val() as FirebaseSensorReading;
        });
      }
      
      // !!! --- UNCOMMENT THE LINE BELOW TO DEBUG --- !!!
      // console.log(`[FB_DATA_PARSED - ${new Date().toLocaleTimeString()}] Parsed fbData (latest reading object):`, fbData);

      if (fbData && typeof fbData === 'object' && Object.keys(fbData).length > 0) {
        const hasPollutantKeys = ['CO_ppm', 'VOCs_ppm', 'PM2_5_ug_m3'].some(key => key in fbData);
        if (!hasPollutantKeys && Object.keys(fbData).length < 5) { // Heuristic: if very few keys and no main pollutants, it might be wrong data
            // console.warn(`[FB_DATA_WARNING - ${new Date().toLocaleTimeString()}] Extracted data object does not seem to contain expected pollutant keys. Data:`, fbData);
             setCurrentData(null);
             setLastProcessedForAI(null); 
             return;
        }

        const appData = mapFirebaseToAppReading(fbData);
        // !!! --- UNCOMMENT THE LINE BELOW TO DEBUG --- !!!
        // console.log(`[FB_DATA_MAPPED - ${new Date().toLocaleTimeString()}] Mapped appData:`, appData);

        setCurrentData(appData);
        setHistoricalData(prevHist => {
          // Use the 'timestamp' field from within the Firebase data record if available
          const recordTimestamp = fbData?.timestamp ? fbData.timestamp * 1000 : Date.now();
          const newHistEntry: HistoricalAirQualityReading = { ...appData, timestamp: new Date(recordTimestamp) };
          const updatedHist = [ ...prevHist, newHistEntry];
          return updatedHist.slice(-MAX_HISTORICAL_READINGS);
        });
        
        checkForNotifications(appData);

        let shouldUpdateAI = false;
        if (!lastProcessedForAI) { // No AI data processed yet
            shouldUpdateAI = true;
        } else if (currentData === null && appData !== null) { // Was null, now valid
            shouldUpdateAI = true;
        } else if (appData !== null && lastProcessedForAI !== null) { // Both valid, check for significant change
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
          // console.log(`[AI_UPDATE_TRIGGER - ${new Date().toLocaleTimeString()}] Triggering AI update due to new/changed sensor data.`);
          updateAiData(appData);
        }
      } else {
        // console.log(`[FB_DATA_EMPTY - ${new Date().toLocaleTimeString()}] fbData (latest reading) is null or empty for path: ${SENSOR_DATA_PATH}. Setting currentData to null.`);
        setCurrentData(null);
        setLastProcessedForAI(null); 
      }
    };

    const handleError = (error: Error) => {
      console.error(`[FB_ERROR - ${new Date().toLocaleTimeString()}] Firebase data read failed for query on path ${SENSOR_DATA_PATH}:`, error);
      if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(false);
        initialSensorLoadDoneRef.current = true;
      }
      setCurrentData(null);
      setLastProcessedForAI(null);
    };

    onValue(sensorDataQuery, handleData, handleError);

    return () => {
      // console.log(`[CONTEXT_CLEANUP - ${new Date().toLocaleTimeString()}] Detaching Firebase listener from query on ${SENSOR_DATA_PATH}`);
      off(sensorDataQuery, 'value', handleData);
      initialSensorLoadDoneRef.current = false; 
    };
  }, [mapFirebaseToAppReading, checkForNotifications, updateAiData]); // Dependencies are stable callbacks

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
        // console.log(`[AI_POLL_TRIGGER - ${new Date().toLocaleTimeString()}] Triggering periodic AI update.`);
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

    