'use server';
/**
 * @fileOverview A bot that can answer questions about resources.
 */

import { ai } from '@/ai/genkit';
import { getResource } from '@/lib/firebase/firestore';
import { z } from 'genkit';

const getResourceTool = ai.defineTool(
  {
    name: 'getResource',
    description: 'Returns the details of a resource given its ID.',
    inputSchema: z.object({
      resourceId: z.string().describe('The ID of the resource.'),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    return await getResource(input.resourceId);
  }
);


const prompt = ai.definePrompt({
    name: 'botPrompt',
    input: { schema: z.object({ query: z.string() }) },
    output: { schema: z.string() },
    tools: [getResourceTool],
    system: `You are BT-bot, a friendly and helpful AI assistant for the 'Beyond Theory' application. Your goal is to help users with their productivity and self-improvement journey.

    If the user asks about a specific resource, use the getResource tool to fetch its details and provide a helpful summary. Do not make up information about resources. If the resource doesn't exist, say so.
    
    If the user asks a general question, provide a helpful and encouraging response.`
});


export async function askBot(query: string): Promise<string> {
    const { output } = await prompt({ query });
    return output ?? "I'm not sure how to respond to that. Can you try asking in a different way?";
}
