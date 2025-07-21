
'use server';
/**
 * @fileOverview Formats and sends an SMS notification to a control room using Twilio API directly.
 *
 * - reportToControlRoom - A function that formats a message and sends it via SMS.
 * - ReportToControlRoomInput - The input type for the function.
 * - ReportToControlRoomOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getActionRecommendations} from './action-recommendations';
import type {ActionRecommendationsInput} from './action-recommendations';
import fetch from 'node-fetch';

const AirQualityReadingSchemaForSms = z
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
    'Optional current air quality sensor readings to include in the SMS.'
  );

const ReportToControlRoomInputSchema = z.object({
  message: z.string().describe('The core message or reason for the report.'),
  currentReadings: AirQualityReadingSchemaForSms,
});
export type ReportToControlRoomInput = z.infer<
  typeof ReportToControlRoomInputSchema
>;

const ReportToControlRoomOutputSchema = z.object({
  confirmationMessage: z
    .string()
    .describe(
      'A message confirming the report status (sent, failed, or not configured).'
    ),
  smsContent: z
    .string()
    .describe('The content of the SMS that was intended to be sent.'),
  messageSid: z
    .string()
    .optional()
    .describe('The Twilio message SID if successfully sent.'),
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
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    const to = process.env.CONTROL_ROOM_PHONE_NUMBER;

    if (!accountSid || !authToken || !from || !to) {
      const missingVars = [
        !accountSid && 'TWILIO_ACCOUNT_SID',
        !authToken && 'TWILIO_AUTH_TOKEN',
        !from && 'TWILIO_PHONE_NUMBER',
        !to && 'CONTROL_ROOM_PHONE_NUMBER',
      ]
        .filter(Boolean)
        .join(', ');
      const logMessage = `Twilio credentials missing: ${missingVars}. SMS not sent.`;
      console.warn(logMessage);
      return {
        confirmationMessage: `SMS not sent: Service not configured. Missing: ${missingVars}.`,
        smsContent: 'Configuration Error',
      };
    }

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
        console.error('Failed to get AI recommendations for SMS', e);
        recommendations = ['Could not generate recommendations.'];
      }
    }

    let body = `Alert: ${input.message}`;
    if (input.currentReadings) {
      body += ` | Readings: CO=${input.currentReadings.co.toFixed(1)}, VOCs=${input.currentReadings.vocs.toFixed(
        0
      )}, PM2.5=${input.currentReadings.pm2_5.toFixed(1)}`;
    }
    if (recommendations.length > 0) {
      body += ` | Actions: ${recommendations.slice(0, 2).join('. ')}.`;
    }
    // Twilio will add their own prefix for trial accounts.
    // body = `Sent from your Twilio trial account - ${body}`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: body,
        }),
      });

      const responseData: any = await response.json();

      if (!response.ok) {
        console.error(
          'Twilio API Error:',
          responseData.message || 'Unknown Error'
        );
        throw new Error(
          `Twilio error ${responseData.code || response.status}: ${
            responseData.message
          }`
        );
      }

      console.log(`SMS submitted successfully. SID: ${responseData.sid}`);
      return {
        confirmationMessage:
          'Report has been successfully sent to the control room via SMS.',
        smsContent: body,
        messageSid: responseData.sid,
      };
    } catch (error: any) {
      console.error('Failed to send SMS via fetch:', error);
      return {
        confirmationMessage: `Failed to send SMS: ${
          error.message || 'Unknown error. Check server logs.'
        }`,
        smsContent: body,
      };
    }
  }
);
