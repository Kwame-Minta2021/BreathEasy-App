
"use client"

import type { HistoricalAirQualityReading, Pollutant } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, TooltipProps } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { format } from 'date-fns';
import React from 'react'; // Import React for useMemo

interface HistoricalDataChartProps {
  data: HistoricalAirQualityReading[];
  selectedPollutants: Array<Pollutant['id']>;
  isLoading: boolean;
}

const pollutantDetails: Record<Pollutant['id'], { name: string; color: string }> = {
  co: { name: 'CO', color: 'hsl(var(--chart-1))' },
  vocs: { name: 'VOCs', color: 'hsl(var(--chart-2))' },
  ch4Lpg: { name: 'CH4/LPG', color: 'hsl(var(--chart-3))' },
  pm1_0: { name: 'PM1.0', color: 'hsl(var(--chart-4))' },
  pm2_5: { name: 'PM2.5', color: 'hsl(var(--chart-5))' },
  pm10_0: { name: 'PM10', color: 'hsl(var(--chart-1))' }, // Re-use colors if more than 5
};

// Define the tooltip content component
const HistoricalChartTooltipActualContent = ({ active, payload, label, chartConfigFromProp }: TooltipProps<number, string> & { chartConfigFromProp: ChartConfig }) => {
  if (active && payload && payload.length) {
    return (
      <ChartTooltipContent
        className="w-[200px]"
        labelFormatter={(value) => format(new Date(value), "HH:mm:ss")}
        formatter={(value, name) => (
           <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartConfigFromProp[name as string]?.color }} />
              {chartConfigFromProp[name as string]?.label || name}: {typeof value === 'number' ? value.toFixed(1) : value}
            </div>
        )}
      />
    );
  }
  return null;
};


export function HistoricalDataChart({ data, selectedPollutants, isLoading }: HistoricalDataChartProps) {
  const chartConfig = React.useMemo(() => {
    return selectedPollutants.reduce((config, id) => {
      const detail = pollutantDetails[id];
      if (detail) {
        config[id] = { label: detail.name, color: detail.color };
      }
      return config;
    }, {} as ChartConfig);
  }, [selectedPollutants]);
  
  const tooltipContentRenderer = React.useMemo(() => {
    return (props: TooltipProps<number, string>) => <HistoricalChartTooltipActualContent {...props} chartConfigFromProp={chartConfig} />;
  }, [chartConfig]);


  return (
    <section aria-labelledby="historical-data-title">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle id="historical-data-title" className="font-headline">Pollutant Trends Over Time</CardTitle>
          <CardDescription>Visualizing the last 30 readings for selected pollutants.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && data.length === 0 ? (
             <div className="h-[350px] w-full flex items-center justify-center">
               <p className="text-muted-foreground">Loading chart data...</p>
             </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(time) => format(new Date(time), "HH:mm")}
                    stroke="hsl(var(--foreground))"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="hsl(var(--foreground))" tickLine={false} axisLine={false} />
                  <ChartTooltip content={tooltipContentRenderer} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {selectedPollutants.map((pollutantId) => {
                     const detail = pollutantDetails[pollutantId];
                     if (detail) {
                        return (
                          <Line
                            key={pollutantId}
                            type="monotone"
                            dataKey={pollutantId}
                            stroke={detail.color}
                            strokeWidth={2}
                            dot={false}
                            name={detail.name}
                          />
                        );
                     }
                     return null;
                  })}
                </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
