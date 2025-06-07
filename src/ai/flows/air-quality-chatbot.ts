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

const llmTool = ai.defineTool(
  {
    name: 'llmTool',
    description: 'Responds to questions about air quality conditions, health impacts, and recommended actions based on the provided context.',
    inputSchema: z.object({
        question: z.string().describe('The user question to be answered.'),
    }),
    outputSchema: z.string()
  },
  async (input) => {
    const {text} = await ai.generate({
        prompt: input.question,
    });
    return text;
  }
);

const airQualityChatbotPrompt = ai.definePrompt({
  name: 'airQualityChatbotPrompt',
  tools: [llmTool],
  input: {schema: AirQualityChatbotInputSchema},
  output: {schema: AirQualityChatbotOutputSchema},
  prompt: `You are an AI chatbot specializing in air quality information.
  Use the llmTool tool to answer user questions about air quality conditions, health impacts, and recommended actions.
  Answer: {{llmTool question=question}}`
});

const airQualityChatbotFlow = ai.defineFlow(
  {
    name: 'airQualityChatbotFlow',
    inputSchema: AirQualityChatbotInputSchema,
    outputSchema: AirQualityChatbotOutputSchema,
  },
  async input => {
    const {output} = await airQualityChatbotPrompt(input);
    return output!;
  }
);
