"use server";

import type { AirQualityAnalysisInput } from '@/ai/flows/air-quality-analysis';
import { analyzeAirQuality } from '@/ai/flows/air-quality-analysis';
import type { ActionRecommendationsInput } from '@/ai/flows/action-recommendations';
import { getActionRecommendations } from '@/ai/flows/action-recommendations';
import type { AirQualityChatbotInput } from '@/ai/flows/air-quality-chatbot';
import { airQualityChatbot } from '@/ai/flows/air-quality-chatbot';

export async function fetchAiAnalysis(data: AirQualityAnalysisInput) {
  try {
    const result = await analyzeAirQuality(data);
    return result;
  } catch (error) {
    console.error("Error fetching AI analysis:", error);
    return { summary: "Could not retrieve AI analysis at this time." };
  }
}

export async function fetchActionRecommendations(data: ActionRecommendationsInput) {
  try {
    const result = await getActionRecommendations(data);
    return result;
  } catch (error) {
    console.error("Error fetching action recommendations:", error);
    return { recommendations: ["Could not retrieve recommendations at this time."] };
  }
}

export async function askChatbot(data: AirQualityChatbotInput) {
  try {
    const result = await airQualityChatbot(data);
    return result;
  } catch (error) {
    console.error("Error interacting with chatbot:", error);
    return { answer: "The chatbot is currently unavailable. Please try again later." };
  }
}
