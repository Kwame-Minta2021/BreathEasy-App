
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle2, Brain, Zap, ShieldAlert } from 'lucide-react';
import { useAirQuality } from '@/contexts/air-quality-context';
import { fetch24hForecast, fetchWeeklyImpact, fetchHealthRisks } from '@/lib/actions'; // Reusing actions

// Using similar interfaces as AI Analyzer page for now
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

export default function ReinforcementAnalysisPage() {
  const { currentData, historicalData, isLoadingReadings } = useAirQuality();
  
  // States for detailed analysis - could be more complex than AI Analyzer
  const [detailedForecast, setDetailedForecast] = useState<ForecastData | null>(null);
  const [detailedImpact, setDetailedImpact] = useState<ImpactData | null>(null);
  const [detailedHealth, setDetailedHealth] = useState<HealthRiskData | null>(null);
  const [bestPractices, setBestPractices] = useState<string[] | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const loadReinforcementAnalysis = async () => {
    if (!currentData && historicalData.length === 0) return;
    setIsLoading(true);
    try {
      // These might call more specialized Genkit flows or same ones with different parameters for "detailed"
      const [forecastRes, impactRes, healthRes, practicesRes] = await Promise.all([
        fetch24hForecast({ currentReadings: currentData, detailLevel: "high" }), // example of more detail
        fetchWeeklyImpact({ historicalData, detailLevel: "high" }),
        fetchHealthRisks({ currentReadings: currentData, forecastData: null, detailLevel: "high" }),
        // Placeholder for best practices, can be more detailed
        Promise.resolve({ recommendations: ["Implement long-term ventilation strategies.", "Identify and mitigate indoor pollution sources.", "Regularly monitor filter replacements in HVAC systems."] }) 
      ]);
      
      setDetailedForecast(forecastRes);
      setDetailedImpact(impactRes);
      setDetailedHealth(healthRes);
      setBestPractices(practicesRes.recommendations);

    } catch (error) {
      console.error("Error fetching reinforcement analysis:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if(currentData || historicalData.length > 0) {
        loadReinforcementAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentData, historicalData]);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2"><ShieldAlert className="text-primary"/>Detailed Reinforcement Learning Analysis</CardTitle>
          <CardDescription>In-depth analytics on future gas trends, health impacts, and best practices from the RL model.</CardDescription>
        </CardHeader>
         <CardContent>
           <Button onClick={loadReinforcementAnalysis} disabled={isLoadingReadings || isLoading}>
            { isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Refresh Detailed Analysis
           </Button>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Loading detailed analysis...</p>
        </div>
      )}

      {!isLoading && (
        <>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="text-primary"/>Future Gas Trends (Detailed)</CardTitle></CardHeader>
            <CardContent>
              {detailedForecast ? <p>{detailedForecast.prediction}</p> : <p className="text-muted-foreground">No detailed forecast available.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="text-primary"/>Health Impact Deep Dive</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {detailedImpact ? <p>{detailedImpact.summary}</p> : <p className="text-muted-foreground">No detailed impact analysis available.</p>}
              {detailedHealth && (
                <>
                  <p><span className="font-semibold">Risk Profile:</span> {detailedHealth.riskLevel}</p>
                  <h4 className="font-semibold">Extended Symptoms Outlook:</h4>
                   {detailedHealth.symptoms.length > 0 ? (
                    <ul className="list-disc list-inside text-sm">
                        {detailedHealth.symptoms.map((symptom, i) => <li key={i}>{symptom}</li>)}
                    </ul>
                    ): (<p className="text-sm text-muted-foreground">No specific symptoms highlighted.</p>)}
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="text-primary"/>Optimized Best Practices</CardTitle></CardHeader>
            <CardContent>
              {bestPractices && bestPractices.length > 0 ? (
                <ul className="space-y-2">
                  {bestPractices.map((rec, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <Brain className="h-4 w-4 mr-2 mt-0.5 text-accent flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No optimized best practices available.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
