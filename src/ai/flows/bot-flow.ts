
'use server';
/**
 * @fileOverview A bot that can answer questions.
 * This bot is designed to be a general conversationalist.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const botPrompt = ai.definePrompt(
  {
    name: 'botPrompt',
    system: 'You are BT-bot, a friendly and helpful AI assistant. Your primary function is to engage in general conversation.',
  },
);

export async function askBot(query: string): Promise<string> {
  try {
    console.log('[askBot] Processing query:', query);
    
    // Simplified call to the AI, no tools involved.
    const result = await botPrompt({ input: query });
    const textResponse = result.text;

    if (textResponse) {
        console.log('[askBot] Returning text response:', textResponse);
        return textResponse;
    }

    // Fallback if no text is generated
    console.warn('[askBot] No text in AI response.');
    return "I'm not sure how to respond to that. Can you try asking in a different way?";
    
  } catch (error: any) {
    console.error('[askBot] Detailed error:', error);
    return "Sorry, I encountered an unexpected error. Please check the server logs for more details.";
  }
}
