
'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing air quality readings and providing a summary of potential health impacts.
 *
 * - analyzeAirQuality - A function that takes air quality readings as input and returns a health impact summary.
 * - AirQualityAnalysisInput - The input type for the analyzeAirQuality function.
 * - AirQualityAnalysisOutput - The return type for the analyzeAirQuality function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AirQualityAnalysisInputSchema = z.object({
  co: z.number().describe('Carbon Monoxide level in ppm'),
  vocs: z.number().describe('Volatile Organic Compounds level in ppb'),
  ch4Lpg: z.number().describe('Methane/Liquified Petroleum Gas level in ppm'),
  pm1_0: z.number().describe('Particulate Matter 1.0 level in ug/m3'),
  pm2_5: z.number().describe('Particulate Matter 2.5 level in ug/m3'),
  pm10_0: z.number().describe('Particulate Matter 10 level in ug/m3'),
});
export type AirQualityAnalysisInput = z.infer<typeof AirQualityAnalysisInputSchema>;

const AirQualityAnalysisOutputSchema = z.object({
  summary: z.string().describe('A summary of the potential health impacts based on the air quality readings.'),
});
export type AirQualityAnalysisOutput = z.infer<typeof AirQualityAnalysisOutputSchema>;

export async function analyzeAirQuality(input: AirQualityAnalysisInput): Promise<AirQualityAnalysisOutput> {
  return analyzeAirQualityFlow(input);
}

const analyzeAirQualityPrompt = ai.definePrompt({
  name: 'analyzeAirQualityPrompt',
  input: {schema: AirQualityAnalysisInputSchema},
  output: {schema: AirQualityAnalysisOutputSchema},
  prompt: `You are an AI assistant specializing in environmental health and safety. Your task is to analyze air quality readings and provide a summary of the potential health impacts based on the pollutant levels detected. Use the following air quality data to generate the summary:\n\nCO (Carbon Monoxide): {{co}} ppm\nVOCs (Volatile Organic Compounds): {{vocs}} ppb\nCH4/LPG (Methane/Liquified Petroleum Gas): {{ch4Lpg}} ppm\nPM1.0 (Particulate Matter 1.0): {{pm1_0}} ug/m3\nPM2.5 (Particulate Matter 2.5): {{pm2_5}} ug/m3\nPM10 (Particulate Matter 10): {{pm10_0}} ug/m3\n\nProvide a concise summary of the potential health impacts, focusing on the most significant risks associated with these pollutant levels.`, 
});

const analyzeAirQualityFlow = ai.defineFlow(
  {
    name: 'analyzeAirQualityFlow',
    inputSchema: AirQualityAnalysisInputSchema,
    outputSchema: AirQualityAnalysisOutputSchema,
  },
  async input => {
    const {output} = await analyzeAirQualityPrompt(input);
    return output!;
  }
);
