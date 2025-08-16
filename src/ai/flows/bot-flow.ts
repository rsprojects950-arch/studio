
'use server';
/**
 * @fileOverview A bot that can answer questions about resources.
 * This bot is designed to be a general conversationalist first,
 * and a resource-fetcher second.
 */

import { ai } from '@/ai/genkit';
import { getResource } from '@/lib/firebase/firestore';
import { z } from 'genkit';

// Temporary simplified version to isolate the issue
export async function askBot(query: string): Promise<string> {
  try {
    // Skip tools for now, just test basic AI response
    const { text } = await ai.generate({
      model: 'googleai/gemini-1.5-flash', // Try this model instead
      prompt: `You are BT-bot, a helpful assistant. Respond to: ${query}`,
    });
    
    return text || "No response generated";
  } catch (error: any) {
    console.error('[askBot] Simple test error:', error);
    return `Error: ${error.message}`;
  }
}
