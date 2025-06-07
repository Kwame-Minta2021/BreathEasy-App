import type { Pollutant } from '@/types';
import { Atom, Flame, Wind, Cloud, ShieldAlert, BarChart2, Percent, Thermometer } from 'lucide-react';

interface PollutantIconProps {
  pollutantId: Pollutant['id'];
  className?: string;
}

export function PollutantIcon({ pollutantId, className }: PollutantIconProps) {
  const commonClassName = className ?? "h-8 w-8 text-primary";

  const renderIcon = () => {
    switch (pollutantId) {
      case 'co':
        return <span className={`font-semibold ${className ?? 'text-xl text-primary'}`}>CO</span>;
      case 'vocs':
        return <Wind className={commonClassName} />;
      case 'ch4Lpg':
        return <Flame className={commonClassName} />;
      case 'pm1_0':
         return <span className={`font-semibold ${className ?? 'text-base text-primary'}`}>PM1.0</span>;
      case 'pm2_5':
        return <span className={`font-semibold ${className ?? 'text-base text-primary'}`}>PM2.5</span>;
      case 'pm10_0':
        return <span className={`font-semibold ${className ?? 'text-base text-primary'}`}>PM10</span>;
      default:
        return <Atom className={commonClassName} />;
    }
  };

  return <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">{renderIcon()}</div>;
}
