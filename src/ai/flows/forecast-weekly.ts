
'use server';
/**
 * @fileOverview Analyzes trends and health outcomes for the coming week.
 *
 * - forecastWeekly - A function that returns a weekly impact analysis.
 * - ForecastWeeklyInput - The input type for the forecastWeekly function.
 * - ForecastWeeklyOutput - The return type for the forecastWeekly function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { HistoricalAirQualityReading } from '@/types';

// Define Zod schema for HistoricalAirQualityReading for use in Genkit
const HistoricalAirQualityReadingSchema = z.object({
  co: z.number(),
  vocs: z.number(),
  ch4Lpg: z.number(),
  pm1_0: z.number(),
  pm2_5: z.number(),
  pm10_0: z.number(),
  timestamp: z.string().datetime().describe("ISO date string for the reading's timestamp"), // Using string for simplicity with Zod, can be Date too.
});


const ForecastWeeklyInputSchema = z.object({
  historicalData: z.array(HistoricalAirQualityReadingSchema).describe("Array of historical air quality readings, ideally last 7 days."),
  detailLevel: z.optional(z.string()).describe("Optional detail level for forecast, e.g., 'high'.")
});
export type ForecastWeeklyInput = z.infer<typeof ForecastWeeklyInputSchema>;

const ForecastWeeklyOutputSchema = z.object({
  summary: z.string().describe('A summary of expected air quality trends and potential health outcomes for the coming week.'),
  potentialSymptoms: z.optional(z.array(z.string())).describe('List of potential symptoms if air quality is poor.'),
});
export type ForecastWeeklyOutput = z.infer<typeof ForecastWeeklyOutputSchema>;

export async function forecastWeekly(input: ForecastWeeklyInput): Promise<ForecastWeeklyOutput> {
  return forecastWeeklyFlow(input);
}

// For complex inputs like arrays, it's often better to summarize or extract key features for the prompt.
// Or, if the model supports it, pass it directly. Here, we'll just acknowledge it.
const prompt = ai.definePrompt({
  name: 'forecastWeeklyPrompt',
  input: {schema: ForecastWeeklyInputSchema},
  output: {schema: ForecastWeeklyOutputSchema},
  prompt: `Based on historical air quality data (number of readings: {{{historicalData.length}}}), analyze the trends and predict the overall air quality and potential health outcomes for the coming week.
  {{#if detailLevel}}Provide a more detailed analysis due to detailLevel: {{{detailLevel}}}.{{/if}}
  Identify any recurring patterns or expected significant changes.
  List potential symptoms if adverse conditions are expected.`,
});

const forecastWeeklyFlow = ai.defineFlow(
  {
    name: 'forecastWeeklyFlow',
    inputSchema: ForecastWeeklyInputSchema,
    outputSchema: ForecastWeeklyOutputSchema,
  },
  async (input) => {
    // Simulate RL model processing historical data.
    const {output} = await prompt(input);
    if (!output) {
        return { summary: "Could not generate weekly forecast at this time."};
    }
    if (input.historicalData.length < 5 && !output.potentialSymptoms) { // Mock symptoms if not much data
        output.potentialSymptoms = ["Mild throat irritation if sensitive."];
    }
    return output;
  }
);
