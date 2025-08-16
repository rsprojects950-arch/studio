
'use server';
/**
 * @fileOverview A bot that can answer questions.
 * This bot is designed to be a general conversationalist.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/**
 * Handles a user's query by sending it to the AI and returning a text response.
 * This is a simplified, robust version focused on stable conversation.
 * @param query The user's message as a string.
 * @returns A promise that resolves to the bot's text response.
 */
export async function askBot(query: string): Promise<string> {
  try {
    console.log('[askBot] Processing query with simple generator:', query);
    
    // Using a direct generate call for maximum simplicity and stability.
    const result = await ai.generate({
      model: 'googleai/gemini-1.5-flash', // A reliable and fast model for conversation
      prompt: `You are BT-bot, a friendly and helpful AI assistant. Your primary function is to engage in general conversation. Respond to the following query: ${query}`,
    });

    // Correctly access the 'text' property
    const textResponse = result.text;

    if (textResponse) {
        console.log('[askBot] Returning text response:', textResponse);
        return textResponse;
    }

    // Fallback if no text is generated for some reason.
    console.warn('[askBot] No text in AI response.');
    return "I'm not sure how to respond to that. Can you try asking in a different way?";
    
  } catch (error: any) {
    // Log the full error details on the server for debugging.
    console.error('[askBot] Detailed error in simple generator:', error);
    // Return a user-friendly error message to the frontend.
    return "Sorry, I encountered an unexpected error. Please check the server logs for more details.";
  }
}
