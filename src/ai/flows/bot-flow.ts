
'use server';
/**
 * @fileOverview A bot that can answer questions about resources.
 * This bot is designed to be a general conversationalist first,
 * and a resource-fetcher second.
 */

import { ai } from '@/ai/genkit';
import { getResource } from '@/lib/firebase/firestore';
import { z } from 'genkit';

const getResourceTool = ai.defineTool(
  {
    name: 'getResource',
    description: 'Use this tool ONLY when a user provides a specific resource ID. The ID will be in the format #[Resource Name](resource-id). Use the text within the parentheses as the resourceId.',
    inputSchema: z.object({
      resourceId: z.string().describe('The unique identifier of the resource.'),
    }),
    outputSchema: z.object({
      title: z.string(),
      description: z.string(),
      url: z.string(),
      type: z.string(),
      category: z.string(),
    }).nullable(),
  },
  async (input) => {
    try {
      console.log('[getResourceTool] Fetching resource:', input.resourceId);
      const id = input.resourceId;
      if (!id) {
        console.log('[getResourceTool] No ID provided');
        return null;
      }
      const result = await getResource(id);
      console.log('[getResourceTool] Result:', result);
      return result;
    } catch (error) {
      console.error(`[getResourceTool] Failed to fetch resource:`, error);
      return null;
    }
  }
);


const botPrompt = ai.definePrompt(
  {
    name: 'botPrompt',
    system: 'You are BT-bot, a friendly and helpful AI assistant. Your primary function is to engage in general conversation. You have a special tool called getResource that you can use to look up information about specific resources if a user asks about one by providing its ID in the format #[Resource Name](resource-id). Only use the tool if the ID is present.',
    tools: [getResourceTool],
  },
);

export async function askBot(query: string): Promise<string> {
  try {
    console.log('[askBot] Processing query:', query);
    
    const result = await botPrompt({ input: query });
    const textResponse = result.text();

    if (textResponse) {
      return textResponse;
    }
    
    return "I'm not sure how to respond to that. Can you try asking in a different way?";
  } catch (error: any) {
    console.error('[askBot] Detailed error:', error);
    return "Sorry, I encountered an unexpected error. Please check the server logs.";
  }
}
