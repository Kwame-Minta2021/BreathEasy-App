
import type { Pollutant } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PollutantIcon } from '@/components/icons/pollutant-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from "@/lib/utils";

interface PollutantCardProps {
  pollutant: Pollutant;
  value: number | null;
  isLoading?: boolean;
}

// Helper function to get color class based on value and pollutant type
const getValueColorClass = (pollutantId: Pollutant['id'], value: number | null): string => {
  if (value === null || isNaN(value)) return 'text-foreground'; // Default color if no value or NaN

  switch (pollutantId) {
    case 'co': // ppm
      if (value < 4.5) return 'text-accent'; // Good
      if (value < 9) return 'text-[hsl(var(--chart-5))]'; // Moderate
      if (value < 15) return 'text-[hsl(var(--chart-4))]'; // Poor
      return 'text-destructive font-bold'; // Very Poor
    case 'vocs': // ppb
      if (value < 200) return 'text-accent'; // Good
      if (value < 500) return 'text-[hsl(var(--chart-5))]'; // Moderate
      if (value < 1000) return 'text-[hsl(var(--chart-4))]'; // Poor
      return 'text-destructive font-bold'; // Very Poor
    case 'ch4Lpg': // ppm
      if (value < 1) return 'text-accent'; // Good
      if (value < 5) return 'text-[hsl(var(--chart-5))]'; // Moderate
      if (value < 10) return 'text-[hsl(var(--chart-4))]'; // Poor
      return 'text-destructive font-bold'; // Very Poor
    case 'pm1_0': // µg/m³
      if (value < 10) return 'text-accent'; // Good
      if (value < 30) return 'text-[hsl(var(--chart-5))]'; // Moderate
      if (value < 50) return 'text-[hsl(var(--chart-4))]'; // Poor
      return 'text-destructive font-bold'; // Very Poor
    case 'pm2_5': // µg/m³
      if (value < 12) return 'text-accent'; // Good
      if (value < 35) return 'text-[hsl(var(--chart-5))]'; // Moderate
      if (value < 55) return 'text-[hsl(var(--chart-4))]'; // Poor (Unhealthy for Sensitive)
      return 'text-destructive font-bold'; // Very Poor (Unhealthy+)
    case 'pm10_0': // µg/m³
      if (value < 54) return 'text-accent'; // Good
      if (value < 154) return 'text-[hsl(var(--chart-5))]'; // Moderate
      if (value < 254) return 'text-[hsl(var(--chart-4))]'; // Poor (Unhealthy for Sensitive)
      return 'text-destructive font-bold'; // Very Poor (Unhealthy+)
    default:
      return 'text-foreground';
  }
};

export function PollutantCard({ pollutant, value, isLoading = false }: PollutantCardProps) {
  const colorClass = getValueColorClass(pollutant.id, value);

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground font-headline">{pollutant.name}</CardTitle>
        <PollutantIcon pollutantId={pollutant.id} className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={cn("text-3xl font-bold", colorClass)}>
            {value !== null && !isNaN(value) ? value.toFixed(1) : '-'}
            <span className="text-xs text-muted-foreground ml-1">{pollutant.unit}</span>
          </div>
        )}
        {pollutant.description && (
          <p className="text-xs text-muted-foreground pt-1">{pollutant.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
