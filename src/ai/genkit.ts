import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()], // googleAI() will automatically use GOOGLE_API_KEY from process.env
  model: 'googleai/gemini-2.0-flash',
});
