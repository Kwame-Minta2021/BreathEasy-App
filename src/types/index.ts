
export interface AirQualityReading {
  co: number; // ppm
  vocs: number; // ppb
  ch4Lpg: number; // ppm
  pm1_0: number; // ug/m3 (PM1.0)
  pm2_5: number; // ug/m3 (PM2.5)
  pm10_0: number; // ug/m3 (PM10)
}

export interface HistoricalAirQualityReading extends AirQualityReading {
  timestamp: Date;
  [key: string]: number | Date;
}

export interface Pollutant {
  id: keyof AirQualityReading;
  name: string;
  unit: string;
  icon?: React.ReactNode;
  description?: string;
  whoGuideline?: number; // Optional WHO guideline value
  whoGuidelineNote?: string; // Optional note for WHO guideline
}

export interface UserThresholds {
  co?: number;
  vocs?: number;
  ch4Lpg?: number;
  pm1_0?: number;
  pm2_5?: number;
  pm10_0?: number;
}

export interface AppNotification {
  id: string;
  pollutantId: keyof AirQualityReading;
  pollutantName: string;
  value: number;
  threshold: number;
  timestamp: Date;
  message: string;
}
