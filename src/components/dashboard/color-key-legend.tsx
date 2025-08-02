
import { cn } from '@/lib/utils';

const legendItems = [
  { label: 'Good', colorClass: 'bg-accent' },
  { label: 'Moderate', colorClass: 'bg-[hsl(var(--chart-5))]' },
  { label: 'Poor', colorClass: 'bg-[hsl(var(--chart-4))]' },
  { label: 'Very Poor', colorClass: 'bg-destructive' },
];

export function ColorKeyLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground p-2 rounded-md bg-muted/50">
      <span className="font-medium text-foreground">Color Key:</span>
      <div className="flex items-center gap-3">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={cn('h-2.5 w-2.5 rounded-full', item.colorClass)} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
