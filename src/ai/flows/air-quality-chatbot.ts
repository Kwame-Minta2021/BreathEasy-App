'use server';

/**
 * @fileOverview This file defines the Genkit flow for the air quality chatbot.
 *
 * - airQualityChatbot - A function that processes user questions about air quality and provides relevant information.
 * - AirQualityChatbotInput - The input type for the airQualityChatbot function.
 * - AirQualityChatbotOutput - The return type for the airQualityChatbot function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AirQualityChatbotInputSchema = z.object({
  question: z.string().describe('The user question about air quality.'),
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
  async (input) => {
    const {text} = await ai.generate({
      prompt: `You are an AI chatbot for an air quality monitoring application.
Your role is to answer questions ONLY about the following topics:
1. Information available on the application's dashboard (e.g., current pollutant levels, historical trends shown on charts).
2. Health advice related to the air quality data presented.
3. Recommendations for actions to take based on the air quality data.

If the question is outside these topics, politely state that you can only answer questions related to the air quality application's data and features.
Do NOT use Markdown formatting in your responses. Provide answers in plain text.

User's question: "${input.question}"`,
    });
    
    if (!text) {
      return { answer: "I couldn't generate a response for that. Could you please try rephrasing your question or ensure it's related to the air quality dashboard, health advice, or recommendations?" };
    }
    
    return { answer: text };
  }
);
