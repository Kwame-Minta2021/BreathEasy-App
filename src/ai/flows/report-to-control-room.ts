
'use server';
/**
 * @fileOverview Formats and sends an SMS notification to a control room using Twilio,
 * optionally including current air quality readings and a Google Maps link to the location.
 *
 * - reportToControlRoom - A function that formats a message and sends it via SMS.
 * - ReportToControlRoomInput - The input type for the function.
 * - ReportToControlRoomOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import Twilio from 'twilio';

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
  latitude: z.number().optional().describe("Optional latitude of the event."),
  longitude: z.number().optional().describe("Optional longitude of the event.")
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

// Schema for the prompt that formats the SMS, including the constructed location link
const ReportFormattingPromptInputSchema = ReportToControlRoomInputSchema.extend({
  locationLink: z.string().optional().describe("An optional Google Maps link for the location of the report.")
});


// This prompt helps format the SMS.
const reportFormattingPrompt = ai.definePrompt({
  name: 'reportFormattingPrompt',
  input: {schema: ReportFormattingPromptInputSchema},
  output: {schema: z.object({ formattedSms: z.string() }) },
  prompt: `Format a concise SMS alert for a control room based on the following information:
User Message: "{{message}}"
{{#if currentReadings}}
Current Air Quality Readings:
- CO: {{currentReadings.co}} ppm
- VOCs: {{currentReadings.vocs}} ppb
- CH4/LPG: {{currentReadings.ch4Lpg}} ppm
- PM1.0: {{currentReadings.pm1_0}} µg/m³
- PM2.5: {{currentReadings.pm2_5}} µg/m³
- PM10: {{currentReadings.pm10_0}} µg/m³
{{/if}}
{{#if locationLink}}
Location: {{{locationLink}}}
{{/if}}
The SMS should be clear, urgent, and include key details. Ensure "Investigate" or similar call to action is present.
Example SMS with readings & location: "URGENT: Air quality alert. User reports: '{{message}}'. Readings: CO {{currentReadings.co}}ppm, PM2.5 {{currentReadings.pm2_5}}µg/m³. Location: {{{locationLink}}}. Investigate."
Example SMS no readings, with location: "URGENT: Report. User reports: '{{message}}'. Location: {{{locationLink}}}. Investigate."
Example SMS with readings, no location: "URGENT: Air quality alert. User reports: '{{message}}'. Readings: CO {{currentReadings.co}}ppm, PM2.5 {{currentReadings.pm2_5}}µg/m³. Investigate."
Example SMS only message, no location: "URGENT: Report. User reports: '{{message}}'. Investigate."
Formatted SMS:`,
});

const reportToControlRoomFlow = ai.defineFlow(
  {
    name: 'reportToControlRoomFlow',
    inputSchema: ReportToControlRoomInputSchema,
    outputSchema: ReportToControlRoomOutputSchema,
  },
  async (input) => {
    let locationLink: string | undefined = undefined;
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (input.latitude && input.longitude) {
      if (googleMapsApiKey && googleMapsApiKey !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        locationLink = `https://www.google.com/maps/search/?api=1&query=${input.latitude},${input.longitude}&key=${googleMapsApiKey}`;
      } else {
        locationLink = `https://www.google.com/maps/search/?api=1&query=${input.latitude},${input.longitude}`;
        if (!googleMapsApiKey || googleMapsApiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
          console.warn("GOOGLE_MAPS_API_KEY is not set or is a placeholder. Maps link will not include API key.");
        }
      }
    }
    
    const promptInputData: z.infer<typeof ReportFormattingPromptInputSchema> = {
        ...input,
        locationLink,
    };

    const {output: promptOutput} = await reportFormattingPrompt(promptInputData);
    
    let smsContent = promptOutput?.formattedSms;
    if (!smsContent) {
        console.warn("SMS content generation by prompt failed. Using fallback.");
        let baseMessage = `URGENT: ${input.message}`;
        if (input.currentReadings) {
            baseMessage += `. Readings: CO ${input.currentReadings.co.toFixed(1)}ppm, VOCs ${input.currentReadings.vocs.toFixed(1)}ppb, CH4/LPG ${input.currentReadings.ch4Lpg.toFixed(1)}ppm, PM1.0 ${input.currentReadings.pm1_0.toFixed(1)}µg/m³, PM2.5 ${input.currentReadings.pm2_5.toFixed(1)}µg/m³, PM10 ${input.currentReadings.pm10_0.toFixed(1)}µg/m³`;
        }
        if (locationLink) {
            baseMessage += `. Location: ${locationLink}`;
        }
        baseMessage += ". Investigate.";
        smsContent = baseMessage;
    }


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
    
    if (accountSid.startsWith('AC') && accountSid.endsWith('_YOUR_SID_HERE')) {
       console.warn("Twilio Account SID seems to be a placeholder. SMS not sent.");
       return {
        confirmationMessage: 'SMS not sent: Twilio Account SID is a placeholder. Please configure it in your .env file.',
        smsContent: smsContent,
      };
    }
     if (authToken.endsWith('_YOUR_TOKEN_HERE')) {
       console.warn("Twilio Auth Token seems to be a placeholder. SMS not sent.");
       return {
        confirmationMessage: 'SMS not sent: Twilio Auth Token is a placeholder. Please configure it in your .env file.',
        smsContent: smsContent,
      };
    }


    try {
      const client = Twilio(accountSid, authToken);
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
