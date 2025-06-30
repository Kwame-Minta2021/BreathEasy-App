
import type { Pollutant } from '@/types';

export const POLLUTANTS_LIST: Pollutant[] = [
  { id: 'co', name: 'Carbon Monoxide', unit: 'ppm', description: 'From incomplete combustion.', whoGuideline: 4, whoGuidelineNote: 'mg/m³ (24-hour mean)' }, // Note: WHO gives CO in mg/m³, conversion to ppm depends on conditions. Using a placeholder value.
  { id: 'vocs', name: 'VOCs', unit: 'ppb', description: 'Volatile Organic Compounds.' }, // WHO has guidelines for specific VOCs like Benzene, Formaldehyde.
  { id: 'ch4Lpg', name: 'Methane/LPG', unit: 'ppm', description: 'Flammable gases.' },
  { id: 'pm1_0', name: 'PM1.0', unit: 'µg/m³', description: 'Fine inhalable particles.' }, // WHO focuses on PM2.5 and PM10
  { id: 'pm2_5', name: 'PM2.5', unit: 'µg/m³', description: 'Fine inhalable particles.', whoGuideline: 5, whoGuidelineNote: 'µg/m³ (annual mean), 15 µg/m³ (24-hour mean)' },
  { id: 'pm10_0', name: 'PM10', unit: 'µg/m³', description: 'Inhalable coarse particles.', whoGuideline: 15, whoGuidelineNote: 'µg/m³ (annual mean), 45 µg/m³ (24-hour mean)' },
];

export const INITIAL_POLLUTANTS_FOR_CHART: Array<Pollutant['id']> = ['co', 'pm2_5', 'vocs'];

export const APP_NAME = "BreathEasy";

export const POLLING_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes


