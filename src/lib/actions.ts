
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
import { database, ref, set as firebaseSet } from '@/lib/firebase';

function logDetailedError(actionName: string, error: any) {
  console.error(
    `Error in ${actionName}:`,
    error?.message || 'Unknown error message',
    error?.stack || 'No stack trace available',
    error?.status ? `Status: ${error.status}` : '',
    error?.errorDetails ? `Details: ${JSON.stringify(error.errorDetails)}` : '',
    error?.cause ? `Cause: ${JSON.stringify(error.cause)}` : ''
  );
}

export async function fetchAiAnalysis(data: AirQualityAnalysisInput): Promise<AirQualityAnalysisOutput> {
  try {
    const result = await analyzeAirQuality(data);
    return result;
  } catch (error: any) {
    logDetailedError("fetchAiAnalysis", error);
    return { summary: "Could not retrieve AI analysis at this time." };
  }
}

export async function fetchActionRecommendations(data: ActionRecommendationsInput): Promise<ActionRecommendationsOutput> {
  try {
    const result = await getActionRecommendations(data);
    return result;
  } catch (error: any) {
    logDetailedError("fetchActionRecommendations", error);
    return { recommendations: ["Could not retrieve recommendations at this time."] };
  }
}

export async function askChatbot(data: AirQualityChatbotInput): Promise<AirQualityChatbotOutput> {
  try {
    const result = await airQualityChatbot(data);
    return result;
  } catch (error: any) {
    logDetailedError("askChatbot", error);
    return { answer: "The chatbot is currently unavailable. Please try again later." };
  }
}

export async function fetch24hForecast(data: Forecast24hInput): Promise<Forecast24hOutput> {
  try {
    return await forecast24h(data);
  } catch (error: any) {
    logDetailedError("fetch24hForecast", error);
    return { prediction: "24-hour forecast is currently unavailable. Please try refreshing.", confidence: "Low" };
  }
}

export async function fetchWeeklyImpact(data: ForecastWeeklyInput): Promise<ForecastWeeklyOutput> {
  try {
    return await forecastWeekly(data);
  } catch (error: any) {
    logDetailedError("fetchWeeklyImpact", error);
    return {
      summary: "Weekly impact analysis is currently unavailable. Please try refreshing.",
      potentialSymptoms: ["Detailed symptom outlook is currently unavailable."]
    };
  }
}

export async function fetchHealthRisks(data: HealthRisksInput): Promise<HealthRisksOutput> {
  try {
    return await getHealthRisks(data);
  } catch (error: any) {
    logDetailedError("fetchHealthRisks", error);
    return { riskLevel: "Unknown", symptoms: [], advice: ["Health risk information is currently unavailable. Please try refreshing."] };
  }
}

export async function reportToControlRoom(input: ReportToControlRoomInput): Promise<ReportToControlRoomOutput> {
  try {
    const reportId = Date.now().toString();
    const reportPath = `control_room_reports/${reportId}`;
    await firebaseSet(ref(database, reportPath), {
      ...input,
      timestamp: reportId,
      status: 'pending', 
    });
    return {
      confirmationMessage: 'Report has been successfully filed and is pending dispatch.',
      reportId: reportId,
    };
  } catch (error: any) {
    logDetailedError("reportToControlRoom", error);
    return {
      confirmationMessage: `Failed to file report: ${ (error as Error).message || "Unknown error"}`,
    };
  }
}
