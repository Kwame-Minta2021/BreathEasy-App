
'use server';

/**
 * @fileOverview This file defines the Genkit flow for the air quality chatbot.
 *
 * - airQualityChatbot - A function that processes user questions about air quality and provides relevant information.
 * - AirQualityChatbotInput - The input type for the airQualityChatbot function.
 * - AirQualityChatbotOutput - The return type for the airQualityChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z, Message} from 'genkit';
import type { AirQualityReading } from '@/types';

// Define Zod schema for AirQualityReading for use in Genkit
const AirQualityReadingSchema = z.object({
  co: z.number(),
  vocs: z.number(),
  ch4Lpg: z.number(),
  pm1_0: z.number(),
  pm2_5: z.number(),
  pm10_0: z.number(),
}).nullable();


const AirQualityChatbotInputSchema = z.object({
  history: z.array(Message.schema).describe('The conversation history.'),
  currentReadings: AirQualityReadingSchema.describe('Current air quality data.'),
});
export type AirQualityChatbotInput = z.infer<typeof AirQualityChatbotInputSchema>;

const AirQualityChatbotOutputSchema = z.object({
  answer: z.string().describe('The chatbot answer to the user question.'),
});
export type AirQualityChatbotOutput = z.infer<typeof AirQualityChatbotOutputSchema>;

export async function airQualityChatbot(input: AirQualityChatbotInput): Promise<AirQualityChatbotOutput> {
  return airQualityChatbotFlow(input);
}

const airQualityChatbotFlow = ai.defineFlow(
  {
    name: 'airQualityChatbotFlow',
    inputSchema: AirQualityChatbotInputSchema,
    outputSchema: AirQualityChatbotOutputSchema,
  },
  async ({history, currentReadings}) => {
    const systemPrompt = `You are an AI chatbot for an air quality monitoring application called BreathEasy.
Your role is to answer questions ONLY about the following topics:
1. Information available on the application's dashboard (e.g., current pollutant levels, historical trends).
2. Health advice related to the air quality data presented.
3. Recommendations for actions to take based on the air quality data.
4. General knowledge about air pollutants and their sources.

If the question is outside these topics, politely state that you can only answer questions related to air quality and the BreathEasy application.
Do NOT use Markdown formatting in your responses. Provide answers in plain text.

If current air quality data is available, use it to answer questions.
Current AirQuality Readings:
${currentReadings ? `
- CO: ${currentReadings.co.toFixed(1)} ppm
- VOCs: ${currentReadings.vocs.toFixed(1)} ppb
- CH4/LPG: ${currentReadings.ch4Lpg.toFixed(1)} ppm
- PM1.0: ${currentReadings.pm1_0.toFixed(1)} µg/m³
- PM2.5: ${currentReadings.pm2_5.toFixed(1)} µg/m³
- PM10: ${currentReadings.pm10_0.toFixed(1)} µg/m³
` : 'Not available.'}
`;

    const {text} = await ai.generate({
      history: history,
      prompt: systemPrompt,
    });
    
    if (!text) {
      return { answer: "I couldn't generate a response for that. Could you please try rephrasing your question or ensure it's related to the air quality dashboard, health advice, or recommendations?" };
    }
    
    return { answer: text };
  }
);
