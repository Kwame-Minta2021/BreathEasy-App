
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
import Twilio from 'twilio';

const ReportToControlRoomInputSchema = z.object({
  message: z.string().describe("The core message or reason for the report."),
  // currentReadings could be added if needed for the SMS content
  // location: z.optional(z.string()).describe("Optional location data.")
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

// This prompt helps format the SMS.
const reportFormattingPrompt = ai.definePrompt({
  name: 'reportFormattingPrompt',
  input: {schema: ReportToControlRoomInputSchema},
  output: {schema: z.object({ formattedSms: z.string() }) },
  prompt: `Format a concise SMS alert for a control room based on the following user message:
User Message: "{{message}}"
The SMS should be clear, urgent, and include key details.
Example SMS: "URGENT: Air quality alert triggered. User reports: '{{message}}'. Investigate immediately."
Formatted SMS:`,
});

const reportToControlRoomFlow = ai.defineFlow(
  {
    name: 'reportToControlRoomFlow',
    inputSchema: ReportToControlRoomInputSchema,
    outputSchema: ReportToControlRoomOutputSchema,
  },
  async (input) => {
    const {output: promptOutput} = await reportFormattingPrompt(input);
    const smsContent = promptOutput?.formattedSms || `ALERT: ${input.message}`;

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
    
    // Mask actual credentials if they accidentally get logged by genkit/next
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
