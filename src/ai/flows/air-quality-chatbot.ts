
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

// Define a base Zod schema for the air quality reading object
const AirQualityReadingObjectSchema = z.object({
  co: z.number(),
  vocs: z.number(),
  ch4Lpg: z.number(),
  pm1_0: z.number(),
  pm2_5: z.number(),
  pm10_0: z.number(),
});

// Create a nullable version for current readings
const AirQualityReadingSchema = AirQualityReadingObjectSchema.nullable();

// Create a non-nullable version for historical data and extend it
const HistoricalAirQualityReadingSchema = AirQualityReadingObjectSchema.extend({
  timestamp: z.string().datetime(),
});


const AppNotificationSchema = z.object({
    id: z.string(),
    pollutantId: z.string(),
    pollutantName: z.string(),
    value: z.number(),
    threshold: z.number(),
    timestamp: z.string().datetime(),
    message: z.string(),
});


const AirQualityChatbotInputSchema = z.object({
  history: z.array(Message.schema).describe('The conversation history, including the latest user question.'),
  currentReadings: AirQualityReadingSchema.describe('Current air quality data. Can be null if sensor is offline.'),
  historicalData: z.array(HistoricalAirQualityReadingSchema).describe('Recent historical air quality readings.'),
  activeNotifications: z.array(AppNotificationSchema).describe('A list of currently active notifications or alerts.'),
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
  async ({history, currentReadings, historicalData, activeNotifications}) => {
    
    // The history already contains the user's latest question.
    // We construct a system prompt to guide the model.
    const systemPrompt = `You are an AI chatbot for an air quality monitoring application called BreathEasy. Your role is to answer questions based ONLY on the provided context.
- The context includes current readings, historical data, and active notifications.
- Your main tasks are:
  1.  Provide information from the application's data (current levels, historical trends, alerts).
  2.  Give health advice related to the provided air quality data.
  3.  Suggest actions based on the data.
  4.  Answer general knowledge questions about the specific pollutants in the data.
- If a question is outside these topics, politely state that you can only answer questions related to air quality and the BreathEasy app.
- Do NOT use Markdown formatting in your responses. Provide answers in plain text.
- If the sensor is offline ('currentReadings' is null), inform the user and use the most recent reading from 'historicalData' to answer questions about "current" conditions, stating the timestamp of that reading.

Here is the context data in JSON format:
Current Readings: ${JSON.stringify(currentReadings)}
Historical Data (last 10 readings): ${JSON.stringify(historicalData.slice(-10))}
Active Notifications: ${JSON.stringify(activeNotifications)}
`;

    // Prepend the system prompt to the history.
    const messages: Message[] = [
      { role: 'system', content: [{ text: systemPrompt }] },
      ...history
    ];

    const {text} = await ai.generate({
      // We pass the modified history with the system prompt to the 'history' field.
      // The model will use the last message in the history as the user's question.
      history: messages,
    });
    
    if (!text) {
      throw new Error("The AI model did not return a text response.");
    }
    
    return { answer: text };
  }
);
