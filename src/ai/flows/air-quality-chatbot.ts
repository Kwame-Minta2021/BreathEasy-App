
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
import type { AirQualityReading, AppNotification } from '@/types';

// Define Zod schemas for the context data
const AirQualityReadingSchema = z.object({
  co: z.number(),
  vocs: z.number(),
  ch4Lpg: z.number(),
  pm1_0: z.number(),
  pm2_5: z.number(),
  pm10_0: z.number(),
});

const HistoricalReadingSchema = AirQualityReadingSchema.extend({
    timestamp: z.string(),
});

const NotificationSchema = z.object({
    id: z.string(),
    pollutantId: z.string(),
    pollutantName: z.string(),
    value: z.number(),
    threshold: z.number(),
    timestamp: z.string(),
    message: z.string(),
});


const AirQualityChatbotInputSchema = z.object({
  history: z.array(Message.schema).describe('The conversation history.'),
  currentData: AirQualityReadingSchema.nullable().describe("The current, real-time air quality readings. This might be null if the sensor is offline."),
  historicalData: z.array(HistoricalReadingSchema).describe("An array of the last 10 historical readings to provide trend context."),
  notifications: z.array(NotificationSchema).describe("An array of the last 5 active notifications or alerts.")
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
  async ({history, currentData, historicalData, notifications}) => {
    
    const systemPrompt = `You are an AI chatbot for an air quality monitoring application called BreathEasy. Your role is to answer questions based ONLY on the provided context.
- Your main tasks are:
  1.  Provide information from the application's data (current levels, historical trends, alerts).
  2.  Give health advice related to the provided air quality data.
  3.  Suggest actions based on the data.
  4.  Answer general knowledge questions about the specific pollutants in the data.
- If a question is outside these topics, politely state that you can only answer questions related to air quality and the BreathEasy app.
- Do NOT use Markdown formatting in your responses. Provide answers in plain text.
- If the sensor is offline ('currentReadings' is null), inform the user and use the most recent reading from 'historicalData' to answer questions about "current" conditions, stating the timestamp of that reading.
- Base your entire response on the JSON data provided in this prompt.`;

    const contextMessage = `Here is the full data context for the user's question:
- Current Readings: ${JSON.stringify(currentData, null, 2)}
- Recent Historical Data: ${JSON.stringify(historicalData, null, 2)}
- Active Notifications: ${JSON.stringify(notifications, null, 2)}
`;

    // The history already contains the user's latest question.
    // We add the system prompt and the context as the first two messages.
    const messages: Message[] = [
      { role: 'system', content: [{ text: systemPrompt }] },
      { role: 'system', content: [{ text: contextMessage }] },
      ...history
    ];

    const generateResponse = await ai.generate({
      history: messages,
    });
    
    const text = generateResponse.text;
    if (!text) {
      throw new Error("The AI model did not return a text response.");
    }
    
    return { answer: text };
  }
);
