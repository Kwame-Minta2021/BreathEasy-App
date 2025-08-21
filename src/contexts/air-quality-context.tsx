
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
import { ref, onValue, off, query, orderByKey, limitToLast, DataSnapshot, set as firebaseSet } from 'firebase/database';

interface FirebaseSensorReading {
  CO_ppm?: number;
  VOCs_ppm?: number;
  CH4_LPG_ppm?: number;
  PM1_0_ug_m3?: number;
  PM2_5_ug_m3?: number;
  PM10_ug_m3?: number;
  timestamp?: number;
  WiFi_SSID?: string;
}


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
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true); // Start as true
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(true); // Start as true
  const [thresholds, setThresholds] = useState<UserThresholds>({});
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7),
    to: new Date(),
  });
  
  const initialSensorLoadDoneRef = useRef(false);
  const notificationsRef = useRef(notifications);
  const isLoadingAnalysisRef = useRef(isLoadingAnalysis);
  const isLoadingRecommendationsRef = useRef(isLoadingRecommendations);
  const currentDataRef = useRef(currentData);
  const lastAiUpdateTimestampRef = useRef(0);


  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    isLoadingAnalysisRef.current = isLoadingAnalysis;
  }, [isLoadingAnalysis]);

  useEffect(() => {
    isLoadingRecommendationsRef.current = isLoadingRecommendations;
  }, [isLoadingRecommendations]);

  useEffect(() => {
    currentDataRef.current = currentData;
  }, [currentData]);


  const mapFirebaseToAppReading = useCallback((fbReading: FirebaseSensorReading): AirQualityReading => {
    return {
      co: fbReading.CO_ppm ?? 0,
      vocs: (fbReading.VOCs_ppm ?? 0),
      ch4Lpg: (fbReading.CH4_LPG_ppm ?? 0) / 1000,
      pm1_0: fbReading.PM1_0_ug_m3 ?? 0,
      pm2_5: fbReading.PM2_5_ug_m3 ?? 0,
      pm10_0: fbReading.PM10_ug_m3 ?? 0,
    };
  }, []);

  const checkForNotifications = useCallback((dataToCheck: AirQualityReading | null, currentThresholds: UserThresholds) => { 
    if (!dataToCheck) return;

    const newNotificationsToAdd: AppNotification[] = [];
    POLLUTANTS_LIST.forEach(pollutant => {
      const thresholdValue = currentThresholds[pollutant.id];
      const currentValue = dataToCheck[pollutant.id];
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
  }, []); 

  const updateAiData = useCallback(async (dataToProcess: AirQualityReading) => {
    if (isLoadingAnalysisRef.current || isLoadingRecommendationsRef.current) return;
    
    setIsLoadingAnalysis(true);
    setIsLoadingRecommendations(true);

    try {
      const analysisInput: AirQualityAnalysisInput = {
        co: dataToProcess.co,
        vocs: dataToProcess.vocs,
        ch4Lpg: dataToProcess.ch4Lpg,
        pm1_0: dataToProcess.pm1_0,
        pm2_5: dataToProcess.pm2_5,
        pm10_0: dataToProcess.pm10_0,
      };
      const recommendationsInput: ActionRecommendationsInput = {
        co: dataToProcess.co,
        vocs: dataToProcess.vocs,
        ch4Lpg: dataToProcess.ch4Lpg,
        pm1_0: dataToProcess.pm1_0,
        pm2_5: dataToProcess.pm2_5,
        pm10: dataToProcess.pm10_0,
      };
      
      const [analysisResult, recommendationsResult] = await Promise.all([
        fetchAiAnalysis(analysisInput),
        fetchActionRecommendations(recommendationsInput),
      ]);
      
      setAiAnalysis(analysisResult.summary);
      setActionRecommendations(recommendationsResult.recommendations);
      lastAiUpdateTimestampRef.current = Date.now();

    } catch (error) {
      console.error("Error fetching AI data in updateAiData:", error);
      setAiAnalysis("Could not retrieve AI analysis at this time.");
      setActionRecommendations(["Could not retrieve recommendations at this time."]);
    } finally {
      setIsLoadingAnalysis(false);
      setIsLoadingRecommendations(false);
    }
  }, []); 

  useEffect(() => {
    const sensorDataNodeRef = ref(database, SENSOR_DATA_PATH);
    const sensorDataQuery = query(sensorDataNodeRef, orderByKey(), limitToLast(1));
    
    if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(true);
    }
    
    const handleData = (snapshot: DataSnapshot) => {
      if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(false); 
        initialSensorLoadDoneRef.current = true;
      }

      let fbData: FirebaseSensorReading | null = null;
      if (snapshot.exists() && snapshot.hasChildren()) {
        snapshot.forEach(childSnapshot => { 
          fbData = childSnapshot.val() as FirebaseSensorReading;
        });
      }
      
      if (!fbData) {
        setCurrentData(null);
        if (initialSensorLoadDoneRef.current) {
            setIsLoadingAnalysis(false);
            setIsLoadingRecommendations(false);
        }
        return; 
      }
      
      const hasPollutantKeys = ['CO_ppm', 'VOCs_ppm', 'PM2_5_ug_m3'].some(key => key in fbData!);
      if (!hasPollutantKeys || Object.keys(fbData!).length < 5 ) { 
           setCurrentData(null); 
           return;
      }

      const appData = mapFirebaseToAppReading(fbData);

      setCurrentData(appData); 
      setHistoricalData(prevHist => {
        const recordTimestamp = fbData?.timestamp ? fbData.timestamp * 1000 : Date.now();
        const newHistEntry: HistoricalAirQualityReading = { ...appData, timestamp: new Date(recordTimestamp) };
        
        // Prevent duplicate timestamps if data arrives too quickly
        if (prevHist.length > 0 && prevHist[prevHist.length - 1].timestamp.getTime() === newHistEntry.timestamp.getTime()) {
            return prevHist;
        }
        
        const updatedHist = [ ...prevHist, newHistEntry];
        return updatedHist.slice(-MAX_HISTORICAL_READINGS);
      });
      
      checkForNotifications(appData, thresholds); 

      // Trigger AI update if polling interval has passed
      const now = Date.now();
      if (now - lastAiUpdateTimestampRef.current > POLLING_INTERVAL_MS) {
        updateAiData(appData);
      } else if (lastAiUpdateTimestampRef.current === 0) { // Also run on first load
        updateAiData(appData);
      }
    };

    const handleError = (error: Error) => {
      if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(false);
        initialSensorLoadDoneRef.current = true;
      }
      console.error("Firebase data error:", error);
      setCurrentData(null);
      setIsLoadingAnalysis(false);
      setIsLoadingRecommendations(false);
    };

    onValue(sensorDataQuery, handleData, handleError);

    return () => {
      off(sensorDataQuery, 'value', handleData);
      initialSensorLoadDoneRef.current = false; 
    };
  }, [mapFirebaseToAppReading, checkForNotifications, thresholds, updateAiData]);

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
        console.error("Firebase threshold data error:", error);
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
