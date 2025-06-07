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
  // For charts, we might want specific values or an overall AQI
  // For simplicity, we'll use pollutant names directly in charts for now.
  // Example: co, vocs, pm2_5 etc. as keys for the chart.
  [key: string]: number | Date;
}

export interface Pollutant {
  id: keyof AirQualityReading;
  name: string;
  unit: string;
  icon?: React.ReactNode;
  description?: string;
}
