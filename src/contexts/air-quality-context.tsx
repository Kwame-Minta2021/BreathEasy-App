
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
  const currentDataRef = useRef(currentData);


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
      vocs: (fbReading.VOCs_ppm ?? 0) * 1000,
      ch4Lpg: fbReading.CH4_LPG_ppm ?? 0,
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

  const updateAiData = useCallback((dataToProcess: AirQualityReading | null) => { 
    if (!dataToProcess || isLoadingAnalysisRef.current || isLoadingRecommendationsRef.current) return;

    setIsLoadingAnalysis(true);
    setIsLoadingRecommendations(true);
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
    Promise.all([
        fetchAiAnalysis(analysisInput),
        fetchActionRecommendations(recommendationsInput),
      ]).then(([analysisResult, recommendationsResult]) => {
        setAiAnalysis(analysisResult.summary);
        setActionRecommendations(recommendationsResult.recommendations);
        setLastProcessedForAI(dataToProcess);
      }).catch (error => {
        console.error("Error fetching AI data in updateAiData:", error);
        setAiAnalysis("Could not retrieve AI analysis at this time.");
        setActionRecommendations(["Could not retrieve recommendations at this time."]);
      }).finally(() => {
        setIsLoadingAnalysis(false);
        setIsLoadingRecommendations(false);
      });
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
        const updatedHist = [ ...prevHist, newHistEntry];
        return updatedHist.slice(-MAX_HISTORICAL_READINGS);
      });
      
      checkForNotifications(appData, thresholds); 
    };

    const handleError = (error: Error) => {
      if (!initialSensorLoadDoneRef.current) {
        setIsLoadingReadings(false);
        initialSensorLoadDoneRef.current = true;
      }
      console.error("Firebase data error:", error);
      setCurrentData(null);
    };

    onValue(sensorDataQuery, handleData, handleError);

    return () => {
      off(sensorDataQuery, 'value', handleData);
      initialSensorLoadDoneRef.current = false; 
    };
  }, [mapFirebaseToAppReading, checkForNotifications, thresholds]);

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

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (currentDataRef.current && !isLoadingAnalysisRef.current && !isLoadingRecommendationsRef.current) {
        updateAiData(currentDataRef.current);
      }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [updateAiData]); 


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
