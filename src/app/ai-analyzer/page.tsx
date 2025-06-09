
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle2, Brain, CalendarDays, TrendingUp, ShieldCheck, Lightbulb } from 'lucide-react';
import { useAirQuality } from '@/contexts/air-quality-context';
import { fetch24hForecast, fetchWeeklyImpact, fetchHealthRisks } from '@/lib/actions'; 
import type { HistoricalAirQualityReading } from '@/types';

interface ForecastData {
  prediction: string; 
  confidence?: string; 
}
interface ImpactData {
  summary: string; 
  potentialSymptoms?: string[];
}
interface HealthRiskData {
  riskLevel: string; 
  symptoms: string[];
  advice: string[];
}

export default function AiAnalyzerPage() {
  const { currentData, historicalData, isLoadingReadings } = useAirQuality();
  const [forecast24h, setForecast24h] = useState<ForecastData | null>(null);
  const [weeklyImpact, setWeeklyImpact] = useState<ImpactData | null>(null);
  const [healthRisks, setHealthRisks] = useState<HealthRiskData | null>(null);
  const [actionRecs, setActionRecs] = useState<string[] | null>(null); 

  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(false);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);


  const loadAiAnalyses = async () => {
    if (!currentData && historicalData.length === 0) return;

    setIsLoadingForecast(true);
    setIsLoadingWeekly(true);
    setIsLoadingHealth(true);
    setIsLoadingRecs(true); 

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const recentHistoricalData = historicalData.filter(
      (reading: HistoricalAirQualityReading) => new Date(reading.timestamp) >= tenMinutesAgo
    );

    try {
      const [forecastRes, weeklyRes, healthRes, recsRes] = await Promise.all([
        fetch24hForecast({ currentReadings: currentData }),
        fetchWeeklyImpact({ historicalData: recentHistoricalData }), 
        fetchHealthRisks({ currentReadings: currentData }),
        // Placeholder for recommendations, can use existing or new flow
        Promise.resolve({ recommendations: ["Ventilate your space regularly.", "Consider using an air purifier during high pollution days."] }) 
      ]);
      setForecast24h(forecastRes);
      setWeeklyImpact(weeklyRes);
      setHealthRisks(healthRes);
      setActionRecs(recsRes.recommendations);

    } catch (error) {
      console.error("Error fetching AI analyses:", error);
      // Set error states for individual sections if needed
    } finally {
      setIsLoadingForecast(false);
      setIsLoadingWeekly(false);
      setIsLoadingHealth(false);
      setIsLoadingRecs(false);
    }
  };
  
  useEffect(() => {
    if (currentData || historicalData.length > 0) {
        loadAiAnalyses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentData, historicalData]);


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><Brain className="text-primary"/>AI Powered Air Quality Analyzer</CardTitle>
          <CardDescription>Insights and forecasts powered by our Reinforcement Learning model.</CardDescription>
        </CardHeader>
        <CardContent>
           <Button onClick={loadAiAnalyses} disabled={isLoadingReadings || (!currentData && historicalData.length === 0) || isLoadingForecast || isLoadingWeekly || isLoadingHealth}>
            { (isLoadingForecast || isLoadingWeekly || isLoadingHealth) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Refresh AI Analysis
           </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="text-primary"/> 24-Hour Forecast</CardTitle>
            <CardDescription>Predicted gas concentrations and general air quality for the next 24 hours.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[100px]">
            {isLoadingForecast ? <Loader2 className="animate-spin" /> : 
             forecast24h ? <p>{forecast24h.prediction} {forecast24h.confidence && `(Confidence: ${forecast24h.confidence})`}</p> : <p className="text-muted-foreground">No forecast data available.</p>
            }
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="text-primary"/> Weekly Impact Analysis</CardTitle>
            <CardDescription>Trends and potential health outcomes for the coming week, based on the last 10 minutes of data.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[100px]">
            {isLoadingWeekly ? <Loader2 className="animate-spin" /> : 
             weeklyImpact ? <p>{weeklyImpact.summary}</p> : <p className="text-muted-foreground">No weekly impact data available.</p>
            }
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary"/> Health Section</CardTitle>
          <CardDescription>Risk levels, potential symptoms, and advisory based on current and predicted conditions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 min-h-[150px]">
          {isLoadingHealth ? <Loader2 className="animate-spin" /> : healthRisks ? (
            <>
              <p><span className="font-semibold">Risk Level:</span> {healthRisks.riskLevel}</p>
              <div>
                <h4 className="font-semibold">Potential Symptoms:</h4>
                {healthRisks.symptoms.length > 0 ? (
                  <ul className="list-disc list-inside text-sm">
                    {healthRisks.symptoms.map((symptom, i) => <li key={i}>{symptom}</li>)}
                  </ul>
                ): (<p className="text-sm text-muted-foreground">No specific symptoms highlighted for current levels.</p>)}
              </div>
              <div>
                <h4 className="font-semibold">Advice:</h4>
                 {healthRisks.advice.length > 0 ? (
                  <ul className="list-disc list-inside text-sm">
                    {healthRisks.advice.map((adv, i) => <li key={i}>{adv}</li>)}
                  </ul>
                ): (<p className="text-sm text-muted-foreground">General health guidelines apply.</p>)}
              </div>
            </>
          ) : <p className="text-muted-foreground">No health risk data available.</p>}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> Best Practices & Recommendations</CardTitle>
          <CardDescription>Actionable advice for improving air quality and mitigating health risks.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[100px]">
           {isLoadingRecs ? <Loader2 className="animate-spin" /> : actionRecs && actionRecs.length > 0 ? (
                <ul className="space-y-2">
                  {actionRecs.map((rec, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-accent flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No specific recommendations available at this time.</p>
              )}
        </CardContent>
      </Card>
    </div>
  );
}
