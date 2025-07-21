
'use server';
/**
 * @fileOverview Formats and saves a report to the Firebase Realtime Database for the control room.
 *
 * - reportToControlRoom - A function that formats a message and saves it to Firebase.
 * - ReportToControlRoomInput - The input type for the function.
 * - ReportToControlRoomOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getActionRecommendations} from './action-recommendations';
import type {ActionRecommendationsInput} from './action-recommendations';
import {database, set, ref} from '@/lib/firebase';

const AirQualityReadingSchemaForReport = z
  .object({
    co: z.number().describe('Carbon Monoxide level in ppm'),
    vocs: z.number().describe('Volatile Organic Compounds level in ppb'),
    ch4Lpg: z.number().describe('Methane/Liquified Petroleum Gas level in ppm'),
    pm1_0: z.number().describe('Particulate Matter 1.0 level in µg/m³'),
    pm2_5: z.number().describe('Particulate Matter 2.5 level in µg/m³'),
    pm10_0: z.number().describe('Particulate Matter 10 level in µg/m³'),
  })
  .optional()
  .describe(
    'Optional current air quality sensor readings to include in the report.'
  );

const ReportToControlRoomInputSchema = z.object({
  message: z.string().describe('The core message or reason for the report.'),
  currentReadings: AirQualityReadingSchemaForReport,
});
export type ReportToControlRoomInput = z.infer<
  typeof ReportToControlRoomInputSchema
>;

const ReportToControlRoomOutputSchema = z.object({
  confirmationMessage: z
    .string()
    .describe(
      'A message confirming the report status (filed or failed).'
    ),
  reportId: z
    .string()
    .optional()
    .describe('The unique ID of the report filed in the database.'),
});
export type ReportToControlRoomOutput = z.infer<
  typeof ReportToControlRoomOutputSchema
>;

export async function reportToControlRoom(
  input: ReportToControlRoomInput
): Promise<ReportToControlRoomOutput> {
  return reportToControlRoomFlow(input);
}

const reportToControlRoomFlow = ai.defineFlow(
  {
    name: 'reportToControlRoomFlow',
    inputSchema: ReportToControlRoomInputSchema,
    outputSchema: ReportToControlRoomOutputSchema,
  },
  async input => {
    let recommendations: string[] = [];
    if (input.currentReadings) {
      try {
        const recsInput: ActionRecommendationsInput = {
          ...input.currentReadings,
          pm10: input.currentReadings.pm10_0,
        };
        const result = await getActionRecommendations(recsInput);
        recommendations = result.recommendations;
      } catch (e) {
        console.error('Failed to get AI recommendations for report', e);
        recommendations = ['Could not generate recommendations.'];
      }
    }

    const reportTimestamp = Date.now();
    const reportId = `report_${reportTimestamp}`;

    const reportData = {
      ...input,
      recommendations,
      timestamp: reportTimestamp,
      status: 'new', // For a backend function to process
    };

    try {
      // Save the report to a new path in Firebase Realtime Database
      const reportRef = ref(database, `control_room_reports/${reportId}`);
      await set(reportRef, reportData);

      console.log(`Report filed successfully. ID: ${reportId}`);
      return {
        confirmationMessage:
          'Report has been successfully filed and is pending review by the control room.',
        reportId: reportId,
      };
    } catch (error: any) {
      console.error('Failed to file report to Firebase:', error);
      return {
        confirmationMessage: `Failed to file report: ${
          error.message || 'Unknown error. Check server logs.'
        }`,
      };
    }
  }
);
