
"use client";
import React, { useState } from 'react';
import { useAirQuality } from '@/contexts/air-quality-context';
import { HistoricalDataChart } from '@/components/dashboard/historical-data-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChartIcon, ListChecks } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Pollutant } from '@/types';
import { POLLUTANTS_LIST, INITIAL_POLLUTANTS_FOR_CHART } from '@/lib/constants';
import { ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts'; // Renamed to RechartsTooltip to avoid conflict
import { ChartTooltipContent, ChartLegend, ChartLegendContent, ChartContainer } from '@/components/ui/chart'; // Shadcn chart components
import type { ChartConfig } from '@/components/ui/chart';
import { format } from 'date-fns';


const pollutantDetailsForBarChart: Record<Pollutant['id'], { name: string; color: string }> = {
  co: { name: 'CO', color: 'hsl(var(--chart-1))' },
  vocs: { name: 'VOCs', color: 'hsl(var(--chart-2))' },
  ch4Lpg: { name: 'CH4/LPG', color: 'hsl(var(--chart-3))' },
  pm1_0: { name: 'PM1.0', color: 'hsl(var(--chart-4))' },
  pm2_5: { name: 'PM2.5', color: 'hsl(var(--chart-5))' },
  pm10_0: { name: 'PM10', color: 'hsl(var(--chart-1))' },
};


function WhoGuidelinesPanel() {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="font-headline text-lg flex items-center gap-2"><ListChecks className="text-primary"/> WHO AQ Guidelines</CardTitle>
        <CardDescription>Reference values from the World Health Organization.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {POLLUTANTS_LIST.filter(p => p.whoGuideline).map(pollutant => (
          <div key={pollutant.id}>
            <span className="font-semibold">{pollutant.name}:</span> {pollutant.whoGuideline} {pollutant.unit}
            {pollutant.whoGuidelineNote && <span className="text-xs text-muted-foreground"> ({pollutant.whoGuidelineNote})</span>}
          </div>
        ))}
        <p className="text-xs text-muted-foreground pt-2">
          These are guideline values. Always consult local authorities for specific health advisories.
        </p>
      </CardContent>
    </Card>
  );
}


export default function VisualizationsPage() {
  const { historicalData, isLoadingReadings, currentData } = useAirQuality();
  const [selectedPollutantsForLine, setSelectedPollutantsForLine] = useState<Array<Pollutant['id']>>(INITIAL_POLLUTANTS_FOR_CHART);

  // For Bar chart, we'll use current data
  const barChartData = currentData ? POLLUTANTS_LIST.map(p => ({
    name: p.name,
    value: currentData[p.id],
    fill: pollutantDetailsForBarChart[p.id]?.color || 'hsl(var(--chart-1))',
    unit: p.unit
  })) : [];

  const barChartConfig = POLLUTANTS_LIST.reduce((config, p) => {
    config[p.name] = {
      label: p.name,
      color: pollutantDetailsForBarChart[p.id]?.color || 'hsl(var(--chart-1))',
    };
    return config;
  }, {} as ChartConfig);


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Data Visualizations</h1>
      <Tabs defaultValue="line-chart">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2">
          <TabsTrigger value="line-chart"><LineChartIcon className="mr-2"/> Trends (Line Chart)</TabsTrigger>
          <TabsTrigger value="bar-chart"><BarChart className="mr-2"/> Current Levels (Bar Chart)</TabsTrigger>
        </TabsList>
        <TabsContent value="line-chart" className="mt-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Pollutant Trends Over Time</CardTitle>
              <CardDescription>Select up to 5 pollutants to see their trends from the last 60 readings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* TODO: Implement multi-select for pollutants */}
              <HistoricalDataChart
                data={historicalData}
                selectedPollutants={selectedPollutantsForLine}
                isLoading={isLoadingReadings && historicalData.length === 0}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="bar-chart" className="mt-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Current Pollutant Levels Comparison</CardTitle>
              <CardDescription>A snapshot of the latest readings for all pollutants.</CardDescription>
            </CardHeader>
            <CardContent>
            {isLoadingReadings && !currentData ? (
                <div className="h-[350px] w-full flex items-center justify-center">
                    <p className="text-muted-foreground">Loading chart data...</p>
                </div>
            ) : (
              <ChartContainer config={barChartConfig} className="h-[350px] w-full">
                <ResponsiveContainer>
                  <BarChart data={barChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" stroke="hsl(var(--foreground))"/>
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" width={100} />
                    <RechartsTooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <ChartTooltipContent
                              className="w-[180px]"
                              label={data.name}
                              formatter={(value) => (
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
                                  {typeof value === 'number' ? value.toFixed(1) : value} {data.unit}
                                </div>
                              )}
                            />
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <WhoGuidelinesPanel />
    </div>
  );
}
