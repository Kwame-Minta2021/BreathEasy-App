
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
  List potential symptoms if adverse conditions are expected. Provide at least one symptom if possible, otherwise an empty array.
  Please ensure your output is structured according to the defined schema, particularly for summary and potentialSymptoms.`,
});

const forecastWeeklyFlow = ai.defineFlow(
  {
    name: 'forecastWeeklyFlow',
    inputSchema: ForecastWeeklyInputSchema,
    outputSchema: ForecastWeeklyOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (!output) {
          console.warn('[Weekly Forecast Flow] Prompt returned null or undefined output. This could be due to the model not adhering to the output schema or an empty response. Input received:', JSON.stringify(input, null, 2));
          return {
            summary: "The AI could not generate a specific weekly forecast based on the current data. Please ensure sufficient historical data is available for meaningful trend analysis.",
            potentialSymptoms: ["Monitor for any unusual symptoms if air quality changes significantly."]
          };
      }
      
      // Ensure potentialSymptoms is an array, even if empty, if the model didn't provide it or it's null.
      if (!output.potentialSymptoms) {
        output.potentialSymptoms = [];
      }

      // If historical data is minimal and model didn't provide symptoms, add a generic one.
      if (input.historicalData.length < 5 && output.potentialSymptoms.length === 0) {
          output.potentialSymptoms.push("With limited historical data, detailed symptom prediction is challenging. General advice is to be aware of changes if air quality deteriorates.");
      }
      return output;
    } catch (error: any) {
      console.error("[Weekly Forecast Flow] Error calling prompt or processing its output. Input:", JSON.stringify(input, null, 2));
      console.error("[Weekly Forecast Flow] Error Message:", error.message);
      console.error("[Weekly Forecast Flow] Error Stack:", error.stack);
      if (error.cause) {
        console.error("[Weekly Forecast Flow] Error Cause:", error.cause);
      }
      return {
        summary: "The AI encountered an issue while trying to generate the weekly forecast. This might be a temporary problem with the AI service or data processing. Please check server logs and try again later.",
        potentialSymptoms: ["General advice: Stay informed about local air quality reports and consult health professionals if you experience symptoms."]
      };
    }
  }
);

