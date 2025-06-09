
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle2, Brain, CalendarDays, TrendingUp, ShieldCheck, Lightbulb } from 'lucide-react';
import { useAirQuality } from '@/contexts/air-quality-context';
import { fetch24hForecast, fetchWeeklyImpact, fetchHealthRisks, fetchActionRecommendations } from '@/lib/actions';
import type { HistoricalAirQualityReading, AirQualityReading } from '@/types';

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
interface ActionRecsData {
  recommendations: string[];
}

const initialForecast: ForecastData = { prediction: "Loading 24-hour forecast..." };
const initialWeeklyImpact: ImpactData = { summary: "Loading weekly impact analysis...", potentialSymptoms: ["Loading potential symptoms..."] };
const initialHealthRisks: HealthRiskData = { riskLevel: "Loading risk level...", symptoms: ["Loading symptoms..."], advice: ["Loading health advice..."] };
const initialActionRecs: ActionRecsData = { recommendations: ["Loading action recommendations..."] };


export default function AiAnalyzerPage() {
  const { currentData, historicalData, isLoadingReadings } = useAirQuality();
  const [forecast24h, setForecast24h] = useState<ForecastData | null>(initialForecast);
  const [weeklyImpact, setWeeklyImpact] = useState<ImpactData | null>(initialWeeklyImpact);
  const [healthRisks, setHealthRisks] = useState<HealthRiskData | null>(initialHealthRisks);
  const [actionRecs, setActionRecs] = useState<ActionRecsData | null>(initialActionRecs);

  const [isLoadingForecast, setIsLoadingForecast] = useState(true);
  const [isLoadingWeekly, setIsLoadingWeekly] = useState(true);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [isLoadingRecs, setIsLoadingRecs] = useState(true);


  const loadAiAnalyses = async () => {
    if (!currentData && historicalData.length === 0 && !isLoadingReadings) {
        setForecast24h({ prediction: "No current air quality data available to generate a forecast."});
        setWeeklyImpact({ summary: "Insufficient historical data for weekly impact analysis.", potentialSymptoms: [] });
        setHealthRisks({ riskLevel: "Unavailable", symptoms: ["No data for health risk assessment."], advice: ["Ensure sensor is active and providing data."] });
        setActionRecs({ recommendations: ["No data available for recommendations."] });
        setIsLoadingForecast(false);
        setIsLoadingWeekly(false);
        setIsLoadingHealth(false);
        setIsLoadingRecs(false);
        return;
    }
    
    if (isLoadingReadings && !currentData && historicalData.length === 0) {
        // Still loading initial readings, keep loading states for AI active
        setForecast24h(initialForecast);
        setWeeklyImpact(initialWeeklyImpact);
        setHealthRisks(initialHealthRisks);
        setActionRecs(initialActionRecs);
        setIsLoadingForecast(true);
        setIsLoadingWeekly(true);
        setIsLoadingHealth(true);
        setIsLoadingRecs(true);
        return;
    }


    setIsLoadingForecast(true);
    setIsLoadingWeekly(true);
    setIsLoadingHealth(true);
    setIsLoadingRecs(true);

    const dataForAi: AirQualityReading = currentData ?? (historicalData.length > 0 ? historicalData[historicalData.length -1] : {
      co: 0, vocs: 0, ch4Lpg: 0, pm1_0: 0, pm2_5: 0, pm10_0: 0 // Default empty reading
    });

    const historicalDataForWeeklyImpact = historicalData.map(reading => ({
      ...reading,
      timestamp: reading.timestamp.toISOString(),
    }));


    try {
      const [forecastRes, weeklyRes, healthRes, recsRes] = await Promise.all([
        fetch24hForecast({ currentReadings: dataForAi }),
        fetchWeeklyImpact({ historicalData: historicalDataForWeeklyImpact }),
        fetchHealthRisks({ currentReadings: dataForAi, forecastData: forecast24h?.prediction !== initialForecast.prediction ? forecast24h : null }), // Pass forecast if already loaded
        fetchActionRecommendations({
            co: dataForAi.co,
            vocs: dataForAi.vocs,
            ch4Lpg: dataForAi.ch4Lpg,
            pm1_0: dataForAi.pm1_0,
            pm2_5: dataForAi.pm2_5,
            pm10: dataForAi.pm10_0,
        })
      ]);
      setForecast24h(forecastRes.prediction ? forecastRes : { prediction: "24-hour forecast could not be generated." });
      setWeeklyImpact(weeklyRes.summary ? weeklyRes : { summary: "Weekly impact analysis could not be generated.", potentialSymptoms: [] });
      setHealthRisks(healthRes.riskLevel ? healthRes : { riskLevel: "Unknown", symptoms: [], advice: ["Health risk assessment could not be completed."] });
      setActionRecs(recsRes.recommendations && recsRes.recommendations.length > 0 ? recsRes : { recommendations: ["Action recommendations could not be generated."] });

    } catch (error) {
      console.error("Error fetching AI analyses:", error);
      setForecast24h({ prediction: "Error loading 24-hour forecast." });
      setWeeklyImpact({ summary: "Error loading weekly impact analysis.", potentialSymptoms: [] });
      setHealthRisks({ riskLevel: "Error", symptoms: ["Error loading symptoms."], advice: ["Error loading health advice."] });
      setActionRecs({ recommendations: ["Error loading recommendations."] });
    } finally {
      setIsLoadingForecast(false);
      setIsLoadingWeekly(false);
      setIsLoadingHealth(false);
      setIsLoadingRecs(false);
    }
  };

  useEffect(() => {
    // Load analysis if we have data, or if we just finished loading readings (even if no data came through)
    if ((currentData || historicalData.length > 0) || !isLoadingReadings) {
        loadAiAnalyses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentData, historicalData, isLoadingReadings]); // isLoadingReadings ensures we run once after initial load


  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><Brain className="text-primary"/>AI Powered Air Quality Analyzer</CardTitle>
          <CardDescription>Insights and forecasts based on current and historical air quality data.</CardDescription>
        </CardHeader>
        <CardContent>
           <Button onClick={loadAiAnalyses} disabled={isLoadingReadings || isLoadingForecast || isLoadingWeekly || isLoadingHealth || isLoadingRecs}>
            { (isLoadingForecast || isLoadingWeekly || isLoadingHealth || isLoadingRecs) ? (
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
            {isLoadingForecast ? <div className="flex items-center space-x-2"><Loader2 className="animate-spin h-4 w-4" /> <p className="text-sm text-muted-foreground">{initialForecast.prediction}</p></div> :
             forecast24h && forecast24h.prediction ? <p>{forecast24h.prediction} {forecast24h.confidence && `(Confidence: ${forecast24h.confidence})`}</p> : <p className="text-muted-foreground">Forecast data is currently unavailable.</p>
            }
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="text-primary"/> Weekly Impact Analysis</CardTitle>
            <CardDescription>Expected air quality trends and potential health outcomes for the coming week, based on historical data.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[100px]">
            {isLoadingWeekly ? <div className="flex items-center space-x-2"><Loader2 className="animate-spin h-4 w-4" /> <p className="text-sm text-muted-foreground">{initialWeeklyImpact.summary}</p></div> :
             weeklyImpact && weeklyImpact.summary ? <p>{weeklyImpact.summary}</p> : <p className="text-muted-foreground">Weekly impact data is currently unavailable.</p>
            }
             {weeklyImpact?.potentialSymptoms && weeklyImpact.potentialSymptoms.length > 0 && weeklyImpact.potentialSymptoms[0] !== initialWeeklyImpact.potentialSymptoms?.[0] && (
              <div className="mt-2">
                <h4 className="text-sm font-semibold">Potential Symptoms:</h4>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  {weeklyImpact.potentialSymptoms.map((symptom, i) => <li key={i}>{symptom}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary"/> Health Section</CardTitle>
          <CardDescription>Risk levels, potential symptoms, and advisory based on current and predicted conditions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 min-h-[150px]">
          {isLoadingHealth ? <div className="flex items-center space-x-2"><Loader2 className="animate-spin h-4 w-4" /> <p className="text-sm text-muted-foreground">{initialHealthRisks.riskLevel}</p></div> : healthRisks && healthRisks.riskLevel ? (
            <>
              <p><span className="font-semibold">Risk Level:</span> {healthRisks.riskLevel}</p>
              <div>
                <h4 className="font-semibold">Potential Symptoms:</h4>
                {healthRisks.symptoms.length > 0 && healthRisks.symptoms[0] !== initialHealthRisks.symptoms[0] ? (
                  <ul className="list-disc list-inside text-sm">
                    {healthRisks.symptoms.map((symptom, i) => <li key={i}>{symptom}</li>)}
                  </ul>
                ): (<p className="text-sm text-muted-foreground">{healthRisks.riskLevel === initialHealthRisks.riskLevel ? initialHealthRisks.symptoms[0] : "No specific symptoms highlighted for current levels."}</p>)}
              </div>
              <div>
                <h4 className="font-semibold">Advice:</h4>
                 {healthRisks.advice.length > 0 && healthRisks.advice[0] !== initialHealthRisks.advice[0] ? (
                  <ul className="list-disc list-inside text-sm">
                    {healthRisks.advice.map((adv, i) => <li key={i}>{adv}</li>)}
                  </ul>
                ): (<p className="text-sm text-muted-foreground">{healthRisks.riskLevel === initialHealthRisks.riskLevel ? initialHealthRisks.advice[0] : "General health guidelines apply."}</p>)}
              </div>
            </>
          ) : <p className="text-muted-foreground">Health risk data is currently unavailable.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lightbulb className="text-primary"/> Action Recommendations</CardTitle>
          <CardDescription>Actionable advice for improving air quality and mitigating health risks.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[100px]">
           {isLoadingRecs ? <div className="flex items-center space-x-2"><Loader2 className="animate-spin h-4 w-4" /> <p className="text-sm text-muted-foreground">{initialActionRecs.recommendations[0]}</p></div> : actionRecs?.recommendations && actionRecs.recommendations.length > 0 && actionRecs.recommendations[0] !== initialActionRecs.recommendations[0] ? (
                <ul className="space-y-2">
                  {actionRecs.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-accent flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{actionRecs?.recommendations && actionRecs.recommendations[0] === initialActionRecs.recommendations[0] ? initialActionRecs.recommendations[0] : "No specific recommendations available at this time."}</p>
              )}
        </CardContent>
      </Card>
    </div>
  );
}

    