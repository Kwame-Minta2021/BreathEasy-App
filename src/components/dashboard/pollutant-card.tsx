import type { Pollutant } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PollutantIcon } from '@/components/icons/pollutant-icon';
import { Skeleton } from '@/components/ui/skeleton';

interface PollutantCardProps {
  pollutant: Pollutant;
  value: number | null;
  isLoading?: boolean;
}

export function PollutantCard({ pollutant, value, isLoading = false }: PollutantCardProps) {
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
          <div className="text-3xl font-bold">
            {value !== null ? value.toFixed(1) : '-'}
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
