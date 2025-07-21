
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
import fetch from 'node-fetch';

const ReportToControlRoomInputSchema = z.object({
  message: z.string().describe('The core message or reason for the report.'),
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
    const smsBody = "hi";

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
