
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


const AirQualityChatbotInputSchema = z.object({
  history: z.array(Message.schema).describe('The conversation history, including the latest user question which contains the full context.'),
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
  async ({history}) => {
    
    const systemPrompt = `You are an AI chatbot for an air quality monitoring application called BreathEasy. Your role is to answer questions based ONLY on the provided context. The user's last message will contain their question and a JSON object with all relevant data.
- Your main tasks are:
  1.  Provide information from the application's data (current levels, historical trends, alerts).
  2.  Give health advice related to the provided air quality data.
  3.  Suggest actions based on the data.
  4.  Answer general knowledge questions about the specific pollutants in the data.
- If a question is outside these topics, politely state that you can only answer questions related to air quality and the BreathEasy app.
- Do NOT use Markdown formatting in your responses. Provide answers in plain text.
- If the sensor is offline ('currentReadings' is null), inform the user and use the most recent reading from 'historicalData' to answer questions about "current" conditions, stating the timestamp of that reading.
- Base your entire response on the JSON data provided in the user's last message.`;

    const messages: Message[] = [
      { role: 'system', content: [{ text: systemPrompt }] },
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
