
"use server";

import type { AirQualityAnalysisInput, AirQualityAnalysisOutput } from '@/ai/flows/air-quality-analysis';
import { analyzeAirQuality } from '@/ai/flows/air-quality-analysis';
import type { ActionRecommendationsInput, ActionRecommendationsOutput } from '@/ai/flows/action-recommendations';
import { getActionRecommendations } from '@/ai/flows/action-recommendations';
import type { AirQualityChatbotInput, AirQualityChatbotOutput } from '@/ai/flows/air-quality-chatbot';
import { airQualityChatbot } from '@/ai/flows/air-quality-chatbot';

import type { Forecast24hInput, Forecast24hOutput } from '@/ai/flows/forecast-24h';
import { forecast24h } from '@/ai/flows/forecast-24h';
import type { ForecastWeeklyInput, ForecastWeeklyOutput } from '@/ai/flows/forecast-weekly';
import { forecastWeekly } from '@/ai/flows/forecast-weekly';
import type { HealthRisksInput, HealthRisksOutput } from '@/ai/flows/health-risks';
import { getHealthRisks } from '@/ai/flows/health-risks';
import type { ReportToControlRoomInput, ReportToControlRoomOutput } from '@/ai/flows/report-to-control-room';
import { reportToControlRoom as reportToControlRoomFlow } from '@/ai/flows/report-to-control-room';


export async function fetchAiAnalysis(data: AirQualityAnalysisInput): Promise<AirQualityAnalysisOutput> {
  try {
    const result = await analyzeAirQuality(data);
    return result;
  } catch (error) {
    console.error("Error fetching AI analysis:", error);
    return { summary: "Could not retrieve AI analysis at this time." };
  }
}

export async function fetchActionRecommendations(data: ActionRecommendationsInput): Promise<ActionRecommendationsOutput> {
  try {
    const result = await getActionRecommendations(data);
    return result;
  } catch (error) {
    console.error("Error fetching action recommendations:", error);
    return { recommendations: ["Could not retrieve recommendations at this time."] };
  }
}

export async function askChatbot(data: AirQualityChatbotInput): Promise<AirQualityChatbotOutput> {
  try {
    const result = await airQualityChatbot(data);
    return result;
  } catch (error) {
    console.error("Error interacting with chatbot:", error);
    return { answer: "The chatbot is currently unavailable. Please try again later." };
  }
}

export async function fetch24hForecast(data: Forecast24hInput): Promise<Forecast24hOutput> {
  try {
    return await forecast24h(data);
  } catch (error) {
    console.error("Error fetching 24h forecast:", error);
    return { prediction: "24-hour forecast is currently unavailable. Please try refreshing.", confidence: "Low" };
  }
}

export async function fetchWeeklyImpact(data: ForecastWeeklyInput): Promise<ForecastWeeklyOutput> {
  try {
    return await forecastWeekly(data);
  } catch (error) {
    console.error("Error fetching weekly impact:", error);
    return {
      summary: "Weekly impact analysis is currently unavailable. Please try refreshing.",
      potentialSymptoms: ["Detailed symptom outlook is currently unavailable."]
    };
  }
}

export async function fetchHealthRisks(data: HealthRisksInput): Promise<HealthRisksOutput> {
  try {
    return await getHealthRisks(data);
  } catch (error) {
    console.error("Error fetching health risks:", error);
    return { riskLevel: "Unknown", symptoms: [], advice: ["Health risk information is currently unavailable. Please try refreshing."] };
  }
}

// Ensure ReportToControlRoomInput type is consistent with the flow's definition
export async function reportToControlRoom(data: ReportToControlRoomInput): Promise<ReportToControlRoomOutput> {
    try {
        return await reportToControlRoomFlow(data);
    } catch (error) {
        console.error("Error reporting to control room:", error);
        let smsContentOnError = `User Message: ${data.message}`;
        if (data.currentReadings) {
            smsContentOnError += ` | Readings: CO ${data.currentReadings.co}, PM2.5 ${data.currentReadings.pm2_5}`;
        }
        if (data.latitude && data.longitude) {
            smsContentOnError += ` | Location: Lat ${data.latitude.toFixed(4)}, Lon ${data.longitude.toFixed(4)}`;
        }
        return { 
            confirmationMessage: `Failed to send report: ${ (error as Error).message || "Unknown error"}`, 
            smsContent: smsContentOnError, // Fallback SMS content
            messageSid: undefined
        };
    }
}
