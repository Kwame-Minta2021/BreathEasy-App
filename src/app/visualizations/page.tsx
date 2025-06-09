
"use client";
import React, { useState, useMemo } from 'react'; // Import useMemo
import { useAirQuality } from '@/contexts/air-quality-context';
import { HistoricalDataChart } from '@/components/dashboard/historical-data-chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart as BarChartIconLucide, LineChartIcon, ListChecks, ChevronDown } from 'lucide-react'; // Renamed BarChart to avoid conflict
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Pollutant } from '@/types';
import { POLLUTANTS_LIST, INITIAL_POLLUTANTS_FOR_CHART } from '@/lib/constants';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { ChartTooltipContent, ChartContainer } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';

const pollutantDetailsForBarChart: Record<Pollutant['id'], { name: string; color: string }> = {
  co: { name: 'CO', color: 'hsl(var(--chart-1))' },
  vocs: { name: 'VOCs', color: 'hsl(var(--chart-2))' },
  ch4Lpg: { name: 'CH4/LPG', color: 'hsl(var(--chart-3))' },
  pm1_0: { name: 'PM1.0', color: 'hsl(var(--chart-4))' },
  pm2_5: { name: 'PM2.5', color: 'hsl(var(--chart-5))' },
  pm10_0: { name: 'PM10', color: 'hsl(var(--chart-1))' }, // Re-use color for the 6th item
};


function WhoGuidelinesPanel() {
  return (
    <Card className="shadow-md mt-6">
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

  const handlePollutantSelectionChange = (pollutantId: Pollutant['id']) => {
    setSelectedPollutantsForLine(prevSelected => {
      const isSelected = prevSelected.includes(pollutantId);
      if (isSelected) {
        return prevSelected.filter(id => id !== pollutantId);
      } else {
        if (prevSelected.length < 5) {
          return [...prevSelected, pollutantId];
        }
        return prevSelected; // Max 5 pollutants
      }
    });
  };

  const barChartData = currentData ? POLLUTANTS_LIST.map(p => ({
    name: p.name,
    value: currentData[p.id],
    fill: pollutantDetailsForBarChart[p.id]?.color || 'hsl(var(--chart-1))',
    unit: p.unit
  })) : [];

  const barChartConfig = useMemo(() => {
    return POLLUTANTS_LIST.reduce((config, p) => {
      const detail = pollutantDetailsForBarChart[p.id];
      if (detail) {
        config[p.name] = {
          label: p.name,
          color: detail.color,
        };
      }
      return config;
    }, {} as ChartConfig);
  }, []); // POLLUTANTS_LIST is constant


  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Data Visualizations</h1>
      <Tabs defaultValue="line-chart">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2">
          <TabsTrigger value="line-chart"><LineChartIcon className="mr-2"/> Trends (Line Chart)</TabsTrigger>
          <TabsTrigger value="bar-chart"><BarChartIconLucide className="mr-2"/> Current Levels (Bar Chart)</TabsTrigger>
        </TabsList>
        <TabsContent value="line-chart" className="mt-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Pollutant Trends Over Time</CardTitle>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardDescription className="flex-grow">Select up to 5 pollutants to see their trends from the last 60 readings.</CardDescription>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-auto shrink-0">
                      Select Pollutants ({selectedPollutantsForLine.length}/5)
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Display Pollutants</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {POLLUTANTS_LIST.map((pollutant) => (
                      <DropdownMenuCheckboxItem
                        key={pollutant.id}
                        checked={selectedPollutantsForLine.includes(pollutant.id)}
                        onCheckedChange={() => handlePollutantSelectionChange(pollutant.id)}
                        disabled={selectedPollutantsForLine.length >= 5 && !selectedPollutantsForLine.includes(pollutant.id)}
                      >
                        {pollutant.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
            ) : barChartData.length > 0 ? (
              <ChartContainer config={barChartConfig} className="h-[350px] w-full">
                <BarChart data={barChartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" stroke="hsl(var(--foreground))" domain={['auto', 'auto']}/>
                  <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} stroke="hsl(var(--foreground))" width={80} interval={0} />
                  <RechartsTooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <ChartTooltipContent
                            className="w-[180px]"
                            label={data.name}
                            itemSorter={() => 0} // Keep original order
                            formatter={(value, name, item, index, p) => (
                              <div className="flex items-center gap-2">
                                 <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p[index].payload.fill }} />
                                {typeof value === 'number' ? value.toFixed(1) : value} {p[index].payload.unit}
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
              </ChartContainer>
            ) : (
                 <div className="h-[350px] w-full flex items-center justify-center">
                    <p className="text-muted-foreground">No current data available for bar chart.</p>
                 </div>
            )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <WhoGuidelinesPanel />
    </div>
  );
}
