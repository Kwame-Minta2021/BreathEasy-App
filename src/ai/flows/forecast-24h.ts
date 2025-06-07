
'use server';
/**
 * @fileOverview Predicts gas concentrations and health impacts for the next 24 hours.
 *
 * - forecast24h - A function that returns a 24-hour forecast.
 * - Forecast24hInput - The input type for the forecast24h function.
 * - Forecast24hOutput - The return type for the forecast24h function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { AirQualityReading } from '@/types';

// Define Zod schema for AirQualityReading for use in Genkit
const AirQualityReadingSchema = z.object({
  co: z.number(),
  vocs: z.number(),
  ch4Lpg: z.number(),
  pm1_0: z.number(),
  pm2_5: z.number(),
  pm10_0: z.number(),
});

const Forecast24hInputSchema = z.object({
  currentReadings: AirQualityReadingSchema.describe("Current air quality sensor readings."),
  detailLevel: z.optional(z.string()).describe("Optional detail level for forecast, e.g., 'high'.")
});
export type Forecast24hInput = z.infer<typeof Forecast24hInputSchema>;

const Forecast24hOutputSchema = z.object({
  prediction: z.string().describe('A textual prediction of gas concentrations and general air quality for the next 24 hours.'),
  confidence: z.optional(z.string()).describe('Confidence level of the prediction (e.g., Low, Moderate, High).'),
});
export type Forecast24hOutput = z.infer<typeof Forecast24hOutputSchema>;

export async function forecast24h(input: Forecast24hInput): Promise<Forecast24hOutput> {
  return forecast24hFlow(input);
}

const prompt = ai.definePrompt({
  name: 'forecast24hPrompt',
  input: {schema: Forecast24hInputSchema},
  output: {schema: Forecast24hOutputSchema},
  prompt: `Based on the current air quality readings:
CO: {{currentReadings.co}} ppm
VOCs: {{currentReadings.vocs}} ppb
CH4/LPG: {{currentReadings.ch4Lpg}} ppm
PM1.0: {{currentReadings.pm1_0}} µg/m³
PM2.5: {{currentReadings.pm2_5}} µg/m³
PM10: {{currentReadings.pm10_0}} µg/m³

Predict the general air quality trend and potential changes in pollutant concentrations for the next 24 hours.
If detailLevel is 'high', provide a more granular prediction.
Include a confidence level for your prediction.`,
});

const forecast24hFlow = ai.defineFlow(
  {
    name: 'forecast24hFlow',
    inputSchema: Forecast24hInputSchema,
    outputSchema: Forecast24hOutputSchema,
  },
  async (input) => {
    // In a real RL model, you'd pass data to the model.
    // For now, we simulate a response.
    const {output} = await prompt(input);
     if (!output) {
      return { prediction: "Could not generate 24-hour forecast at this time.", confidence: "Low" };
    }
    // Add a mock confidence if not provided by LLM
    if (!output.confidence) {
        output.confidence = Math.random() > 0.6 ? "High" : Math.random() > 0.3 ? "Moderate" : "Low";
    }
    return output;
  }
);
