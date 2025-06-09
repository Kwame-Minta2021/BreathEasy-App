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
    // Directly use ai.generate with the default model configured in ai/genkit.ts
    // The prompt now directly incorporates the user's question.
    const {text} = await ai.generate({
      prompt: `You are an AI chatbot specializing in air quality information. Please answer the following question concisely and helpfully: "${input.question}"`,
    });
    
    if (!text) {
      // This case handles scenarios where the model might return an empty response.
      return { answer: "I couldn't generate a response for that. Could you please try rephrasing your question?" };
    }
    
    return { answer: text };
  }
);