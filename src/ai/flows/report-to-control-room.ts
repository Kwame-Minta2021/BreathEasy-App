
'use server';
/**
 * @fileOverview Formats and (conceptually) sends an SMS notification to a control room.
 *
 * - reportToControlRoom - A function that simulates sending a report.
 * - ReportToControlRoomInput - The input type for the function.
 * - ReportToControlRoomOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReportToControlRoomInputSchema = z.object({
  message: z.string().describe("The core message or reason for the report."),
  // currentReadings could be added if needed for the SMS content
  // location: z.optional(z.string()).describe("Optional location data.")
});
export type ReportToControlRoomInput = z.infer<typeof ReportToControlRoomInputSchema>;

const ReportToControlRoomOutputSchema = z.object({
  confirmationMessage: z.string().describe('A message confirming the report has been (conceptually) sent.'),
  smsContent: z.string().describe('The content of the SMS that would be sent.'),
});
export type ReportToControlRoomOutput = z.infer<typeof ReportToControlRoomOutputSchema>;

export async function reportToControlRoom(input: ReportToControlRoomInput): Promise<ReportToControlRoomOutput> {
  return reportToControlRoomFlow(input);
}

// This prompt helps format the SMS, not decide if to send it.
// The actual sending would be a separate step after the LLM.
const prompt = ai.definePrompt({
  name: 'reportToControlRoomPrompt',
  input: {schema: ReportToControlRoomInputSchema},
  output: {schema: z.object({ formattedSms: z.string() }) },
  prompt: `Format a concise SMS alert for a control room based on the following user message:
User Message: "{{message}}"
The SMS should be clear, urgent, and include key details. Assume current air quality data is critical if implied by message.
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
    const {output: promptOutput} = await prompt(input);
    const smsContent = promptOutput?.formattedSms || `ALERT: ${input.message}`;

    // In a real app, you would use an SMS API (e.g., Twilio) here.
    // console.log(`Simulating SMS to control room: ${smsContent}`);

    return {
      confirmationMessage: 'Report has been formatted and (conceptually) sent to the control room.',
      smsContent: smsContent,
    };
  }
);
