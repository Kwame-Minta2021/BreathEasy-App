// 'use server';
/**
 * @fileOverview This file defines a Genkit flow for recommending actions to mitigate the harmful effects of air pollutants.
 *
 * - getActionRecommendations - A function that returns action recommendations based on air quality data.
 * - ActionRecommendationsInput - The input type for the getActionRecommendations function.
 * - ActionRecommendationsOutput - The return type for the getActionRecommendations function.
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ActionRecommendationsInputSchema = z.object({
  co: z.number().describe('Carbon monoxide level in ppm.'),
  vocs: z.number().describe('Volatile organic compounds level in ppb.'),
  ch4Lpg: z.number().describe('Methane and Liquefied Petroleum Gas level in ppm.'),
  pm1_0: z.number().describe('Particulate matter with a diameter of 1.0 micrometer or less in μg/m3.'),
  pm2_5: z.number().describe('Particulate matter with a diameter of 2.5 micrometers or less in μg/m3.'),
  pm10: z.number().describe('Particulate matter with a diameter of 10 micrometers or less in μg/m3.'),
});
export type ActionRecommendationsInput = z.infer<typeof ActionRecommendationsInputSchema>;

const ActionRecommendationsOutputSchema = z.object({
  recommendations: z.array(
    z.string().describe('A specific action to take to mitigate the harmful effects of air pollutants.')
  ).describe('A list of recommended actions.')
});
export type ActionRecommendationsOutput = z.infer<typeof ActionRecommendationsOutputSchema>;

export async function getActionRecommendations(input: ActionRecommendationsInput): Promise<ActionRecommendationsOutput> {
  return actionRecommendationsFlow(input);
}

const actionRecommendationsPrompt = ai.definePrompt({
  name: 'actionRecommendationsPrompt',
  input: {schema: ActionRecommendationsInputSchema},
  output: {schema: ActionRecommendationsOutputSchema},
  prompt: `Given the following air quality readings, recommend immediate actions to mitigate the harmful effects of the detected pollutants. Focus on actions the user can take to protect their health.

Air Quality Readings:
- Carbon Monoxide (CO): {{co}} ppm
- Volatile Organic Compounds (VOCs): {{vocs}} ppb
- Methane and Liquefied Petroleum Gas (CH4/LPG): {{ch4Lpg}} ppm
- Particulate Matter (PM1.0): {{pm1_0}} μg/m3
- Particulate Matter (PM2.5): {{pm2_5}} μg/m3
- Particulate Matter (PM10): {{pm10}} μg/m3

Recommendations:`,
});

const actionRecommendationsFlow = ai.defineFlow(
  {
    name: 'actionRecommendationsFlow',
    inputSchema: ActionRecommendationsInputSchema,
    outputSchema: ActionRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await actionRecommendationsPrompt(input);
    return output!;
  }
);
