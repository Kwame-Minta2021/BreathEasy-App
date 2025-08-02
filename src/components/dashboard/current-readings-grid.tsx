import type { AirQualityReading, Pollutant } from '@/types';
import { PollutantCard } from './pollutant-card';

interface CurrentReadingsGridProps {
  currentData: AirQualityReading | null;
  isLoading: boolean;
}

const pollutantsList: Pollutant[] = [
  { id: 'co', name: 'Carbon Monoxide', unit: 'ppm', description: 'From incomplete combustion.' },
  { id: 'vocs', name: 'VOCs', unit: 'ppb', description: 'Volatile Organic Compounds.' },
  { id: 'ch4Lpg', name: 'Methane/LPG', unit: 'ppm', description: 'Flammable gases.' },
  { id: 'pm1_0', name: 'PM1.0', unit: 'µg/m³', description: 'Fine inhalable particles.' },
  { id: 'pm2_5', name: 'PM2.5', unit: 'µg/m³', description: 'Fine inhalable particles.' },
  { id: 'pm10_0', name: 'PM10', unit: 'µg/m³', description: 'Inhalable coarse particles.' },
];

export function CurrentReadingsGrid({ currentData, isLoading }: CurrentReadingsGridProps) {
  return (
    <section aria-labelledby="current-readings-title">
      <h2 id="current-readings-title" className="sr-only">
        Current Air Quality
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {pollutantsList.map((pollutant) => (
          <PollutantCard
            key={pollutant.id}
            pollutant={pollutant}
            value={currentData ? currentData[pollutant.id] : null}
            isLoading={isLoading}
          />
        ))}
      </div>
    </section>
  );
}
