
'use server';
/**
 * @fileOverview Delineates risk levels, symptoms, and advice based on air quality.
 *
 * - getHealthRisks - A function that returns health risk information.
 * - HealthRisksInput - The input type for the getHealthRisks function.
 * - HealthRisksOutput - The return type for the getHealthRisks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AirQualityReading } from '@/types';


const AirQualityReadingSchema = z.object({
  co: z.number(),
  vocs: z.number(),
  ch4Lpg: z.number(),
  pm1_0: z.number(),
  pm2_5: z.number(),
  pm10_0: z.number(),
});

const ForecastDataSchema = z.object({ // Simplified forecast data for context
    prediction: z.string(),
    confidence: z.optional(z.string()),
}).nullable();


const HealthRisksInputSchema = z.object({
  currentReadings: AirQualityReadingSchema.describe("Current air quality sensor readings."),
  forecastData: ForecastDataSchema.describe("Optional 24-hour forecast data for context."),
  detailLevel: z.optional(z.string()).describe("Optional detail level for advice, e.g., 'high'.")
});
export type HealthRisksInput = z.infer<typeof HealthRisksInputSchema>;

const HealthRisksOutputSchema = z.object({
  riskLevel: z.string().describe('Overall health risk level (e.g., Low, Moderate, High, Very High).'),
  symptoms: z.array(z.string()).describe('List of potential symptoms associated with the current/forecasted air quality.'),
  advice: z.array(z.string()).describe('List of actionable advice to mitigate health risks.'),
});
export type HealthRisksOutput = z.infer<typeof HealthRisksOutputSchema>;

export async function getHealthRisks(input: HealthRisksInput): Promise<HealthRisksOutput> {
  return healthRisksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'healthRisksPrompt',
  input: {schema: HealthRisksInputSchema},
  output: {schema: HealthRisksOutputSchema},
  prompt: `Current Air Quality:
CO: {{currentReadings.co}} ppm, VOCs: {{currentReadings.vocs}} ppb, CH4/LPG: {{currentReadings.ch4Lpg}} ppm, PM1.0: {{currentReadings.pm1_0}} µg/m³, PM2.5: {{currentReadings.pm2_5}} µg/m³, PM10: {{currentReadings.pm10_0}} µg/m³

{{#if forecastData}}
24h Forecast: {{forecastData.prediction}} (Confidence: {{forecastData.confidence}})
{{/if}}

Based on the current air quality and forecast (if available), determine the overall health risk level.
List potential symptoms people might experience.
Provide actionable advice to mitigate these risks.
{{#if detailLevel}}Provide more detailed advice due to detailLevel: {{{detailLevel}}}.{{/if}}
Ensure the advice is practical for individuals.`,
});

const healthRisksFlow = ai.defineFlow(
  {
    name: 'healthRisksFlow',
    inputSchema: HealthRisksInputSchema,
    outputSchema: HealthRisksOutputSchema,
  },
  async (input) => {
    // Simulate RL model or complex logic.
    const {output} = await prompt(input);
    if (!output) {
        return { riskLevel: "Unknown", symptoms: ["Could not determine symptoms."], advice: ["Unable to provide advice at this time."] };
    }
    if (output.symptoms.length === 0) {
        output.symptoms.push("No specific symptoms typically expected at these levels for the general population.");
    }
    if (output.advice.length === 0) {
        output.advice.push("Follow general health guidelines. Stay hydrated.");
    }
    return output;
  }
);
