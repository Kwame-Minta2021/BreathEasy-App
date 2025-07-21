
'use server';
/**
 * @fileOverview A service for sending SMS messages via the Hubtel API.
 *
 * - reportToControlRoom - A function that formats a message and sends it.
 * - ReportToControlRoomInput - The input type for the function.
 * - ReportToControlRoomOutput - The return type for the function.
 */
import fetch from 'node-fetch';

export interface ReportToControlRoomInput {
  message: string;
}

export interface ReportToControlRoomOutput {
  confirmationMessage: string;
  reportId?: string;
}

export async function reportToControlRoom(
  input: ReportToControlRoomInput
): Promise<ReportToControlRoomOutput> {
    const smsBody = input.message;

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
