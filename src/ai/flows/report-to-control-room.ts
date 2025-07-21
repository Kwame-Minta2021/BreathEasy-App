
'use server';
/**
 * @fileOverview Formats and sends a report to the control room via Hubtel SMS.
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
    
    const smsBody = `BreathEasy Alert: ${input.message}\nReadings: ${readingsText}\nHealth Impact: ${healthImpactSummary}`;

    const clientId = process.env.HUBTEL_CLIENT_ID;
    const clientSecret = process.env.HUBTEL_CLIENT_SECRET;
    const from = process.env.SENDER_ID;
    const to = process.env.CONTROL_ROOM_PHONE_NUMBER;

    if (!clientId || !clientSecret || !from || !to) {
      const errorMessage = "Hubtel credentials or recipient phone number are not configured in environment variables.";
      console.error(errorMessage);
      return {
        confirmationMessage: `Failed to send report: ${errorMessage}`,
      };
    }
    
    const params = new URLSearchParams({
        clientsecret: clientSecret,
        clientid: clientId,
        from: from,
        to: to,
        content: smsBody,
    });
    
    const endpoint = `https://smsc.hubtel.com/v1/messages/send?${params.toString()}`;

    try {
      const response = await fetch(endpoint);
      
      if (response.status === 201) {
        const responseData = await response.json() as { status?: number, messageId?: string, message?: string };
        const hubtelStatus = responseData.status;

        if (hubtelStatus === 0 || hubtelStatus === 1) { // 0: Pending, 1: Sent
          return {
            confirmationMessage: 'Report has been successfully sent to the control room.',
            reportId: responseData.messageId || 'N/A',
          };
        } else {
           const errorMessage = `Hubtel API Error: ${responseData.message || JSON.stringify(responseData)}`;
           console.error(errorMessage);
           return { confirmationMessage: `Failed to send report: ${errorMessage}` };
        }
      } else {
        const responseText = await response.text();
        const errorMessage = `Hubtel API Error (Status ${response.status}): ${responseText}`;
        console.error(errorMessage);
        return { confirmationMessage: `Failed to send report: ${errorMessage}` };
      }

    } catch (error: any) {
        console.error('Exception when sending SMS via Hubtel:', error);
        return {
            confirmationMessage: `Failed to send report: ${error.message || 'Unknown network error.'}`,
        };
    }
  }
);
