
'use server';
/**
 * @fileOverview Formats and sends a report to the control room via MNotify SMS.
 *
 * - reportToControlRoom - A function that formats a message and sends it.
 * - ReportToControlRoomInput - The input type for the function.
 * - ReportToControlRoomOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {analyzeAirQuality} from './air-quality-analysis';
import type {AirQualityAnalysisInput} from './air-quality-analysis';
import fetch from 'node-fetch';

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
    .describe('A message confirming the report status (sent or failed).'),
  reportId: z
    .string()
    .optional()
    .describe('The ID of the message if sent successfully.'),
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
    let healthImpactSummary = 'No health analysis available.';
    let readingsText = 'No readings provided.';

    if (input.currentReadings) {
      try {
        const analysisInput: AirQualityAnalysisInput = {
          ...input.currentReadings,
        };
        const result = await analyzeAirQuality(analysisInput);
        healthImpactSummary = result.summary;

        readingsText = `CO: ${input.currentReadings.co.toFixed(1)}ppm, PM2.5: ${input.currentReadings.pm2_5.toFixed(1)}µg/m³, VOCs: ${input.currentReadings.vocs.toFixed(0)}ppb`;

      } catch (e) {
        console.error('Failed to get AI health analysis for report', e);
        healthImpactSummary = 'Could not generate health impact analysis.';
      }
    }
    
    const smsBody = `BreathEasy Alert: ${input.message}\n\nCurrent Readings: ${readingsText}\n\nHealth Impact: ${healthImpactSummary}`;

    const apiKey = process.env.MNOTIFY_API_KEY;
    const toNumber = process.env.CONTROL_ROOM_PHONE_NUMBER;
    const senderId = 'BreathEasy';

    if (!apiKey || !toNumber) {
      const errorMessage = "MNotify API key or recipient phone number are not configured in environment variables.";
      console.error(errorMessage);
      return {
        confirmationMessage: `Failed to send report: ${errorMessage}`,
      };
    }

    const endpoint = `https://api.mnotify.com/api/sms/quick?key=${apiKey}`;
    
    const params = new URLSearchParams({
        to: toNumber,
        msg: smsBody,
        sender_id: senderId,
    });

    try {
      const response = await fetch(`${endpoint}&${params.toString()}`, {
          method: 'GET', // MNotify Quick SMS uses GET
      });

      const responseData: any = await response.json();

      if (response.ok && responseData.code === '2000') {
          console.log(`SMS sent successfully via MNotify. ID: ${responseData.message_id}`);
          return {
              confirmationMessage: 'Report has been successfully sent to the control room.',
              reportId: responseData.message_id,
          };
      } else {
          const errorMessage = `MNotify error ${responseData.code}: ${responseData.message}`;
          console.error('Failed to send SMS via MNotify:', errorMessage, responseData);
          return {
              confirmationMessage: `Failed to send report: ${errorMessage}`,
          };
      }
    } catch (error: any) {
        console.error('Exception when sending SMS via MNotify:', error);
        return {
            confirmationMessage: `Failed to send report: ${error.message || 'Unknown network error.'}`,
        };
    }
  }
);
