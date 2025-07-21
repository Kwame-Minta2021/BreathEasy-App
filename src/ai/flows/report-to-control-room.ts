
'use server';
/**
 * @fileOverview Formats and sends an SMS notification to a control room using Twilio.
 *
 * - reportToControlRoom - A function that formats a message and sends it via SMS.
 * - ReportToControlRoomInput - The input type for the function.
 * - ReportToControlRoomOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import twilio from 'twilio';

const AirQualityReadingSchemaForSms = z.object({
  co: z.number().describe('Carbon Monoxide level in ppm'),
  vocs: z.number().describe('Volatile Organic Compounds level in ppb'),
  ch4Lpg: z.number().describe('Methane/Liquified Petroleum Gas level in ppm'),
  pm1_0: z.number().describe('Particulate Matter 1.0 level in µg/m³'),
  pm2_5: z.number().describe('Particulate Matter 2.5 level in µg/m³'),
  pm10_0: z.number().describe('Particulate Matter 10 level in µg/m³'),
}).optional().describe("Optional current air quality sensor readings to include in the SMS.");

const ReportToControlRoomInputSchema = z.object({
  message: z.string().describe("The core message or reason for the report."),
  currentReadings: AirQualityReadingSchemaForSms,
});
export type ReportToControlRoomInput = z.infer<typeof ReportToControlRoomInputSchema>;

const ReportToControlRoomOutputSchema = z.object({
  confirmationMessage: z.string().describe('A message confirming the report status (sent, failed, or not configured).'),
  smsContent: z.string().describe('The content of the SMS that was intended to be sent.'),
  messageSid: z.string().optional().describe('The Twilio message SID if successfully sent.'),
});
export type ReportToControlRoomOutput = z.infer<typeof ReportToControlRoomOutputSchema>;

export async function reportToControlRoom(input: ReportToControlRoomInput): Promise<ReportToControlRoomOutput> {
  return reportToControlRoomFlow(input);
}


const reportToControlRoomFlow = ai.defineFlow(
  {
    name: 'reportToControlRoomFlow',
    inputSchema: ReportToControlRoomInputSchema,
    outputSchema: ReportToControlRoomOutputSchema,
  },
  async (input) => {
    
    const smsContent = "hi";

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const controlRoomPhoneNumber = process.env.CONTROL_ROOM_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhoneNumber || !controlRoomPhoneNumber) {
      console.warn("Twilio credentials or phone numbers are not configured in .env file. SMS not sent.");
      return {
        confirmationMessage: 'SMS not sent: Twilio service is not configured. Please check server logs and .env file.',
        smsContent: smsContent,
      };
    }

    try {
      // Use the standard Twilio client initialization
      const client = twilio(accountSid, authToken);
      
      const message = await client.messages.create({
        body: smsContent,
        from: twilioPhoneNumber,
        to: controlRoomPhoneNumber,
      });

      console.log(`SMS sent successfully. Message SID: ${message.sid}`);
      return {
        confirmationMessage: 'Report has been successfully sent to the control room via SMS.',
        smsContent: smsContent,
        messageSid: message.sid,
      };
    } catch (error: any) {
      console.error("Failed to send SMS via Twilio:", error);
      return {
        confirmationMessage: `Failed to send SMS: ${error.message || 'Unknown Twilio error. Check server logs.'}`,
        smsContent: smsContent,
      };
    }
  }
);
