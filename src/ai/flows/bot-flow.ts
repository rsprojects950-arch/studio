
'use server';
/**
 * @fileOverview A bot that can answer questions about resources.
 */

import { ai } from '@/ai/genkit';
import { getResource } from '@/lib/firebase/firestore';
import { z, AIMessage, Part, toolRequest, toolResponse } from 'genkit';

const getResourceTool = ai.defineTool(
  {
    name: 'getResource',
    description: 'Use this tool to get the details of a specific resource when a user provides its ID. The tool will return the full resource details if found, or null if not found or if an error occurs. The AI should handle the case where the resource is not found and inform the user.',
    inputSchema: z.object({
      resourceId: z.string().describe('The unique identifier of the resource.'),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    try {
        // The AI might pass the whole object or just the string.
        const id = typeof input === 'string' ? input : input.resourceId;
        return await getResource(id);
    } catch (error) {
        console.error(`[getResourceTool] Failed to fetch resource:`, error);
        // Return null to the AI, so it can respond gracefully to the user.
        return null;
    }
  }
);


const prompt = ai.definePrompt({
    name: 'botPrompt',
    tools: [getResourceTool],
    system: `You are BT-bot, a friendly and helpful AI assistant for the 'Beyond Theory' application. Your goal is to help users with their productivity and self-improvement journey.

    If a user's query contains a resource ID (e.g., in the format #[...](...)), you MUST use the getResource tool to fetch its details. Do not answer from memory or make up information about resources.
    
    - If the tool returns resource details, summarize them for the user and you MUST include a tag in the format #[title](id) in your response. For example: "Next.js is a great framework. You can learn more here: #[Next.js](nextjs-id)".
    - If the tool returns null or an empty response, you MUST inform the user that the resource could not be found or that you're having trouble accessing it. Do not try to use the tool again for the same ID in the same conversation turn.
    
    If the user asks a general question not related to a specific resource, provide a helpful and encouraging response.`
});


export async function askBot(query: string): Promise<string> {
    const history: AIMessage[] = [{ role: 'user', content: [{ text: query }] }];

    // Start the conversation
    let result = await prompt({ history });

    while (true) {
        const output = result.output;

        if (!output || !output.content) {
            return "Sorry, I encountered an unexpected error. Please try again.";
        }
        
        const toolRequestPart = output.content.find(part => part.toolRequest);

        if (!toolRequestPart || !toolRequestPart.toolRequest) {
            // No tool request, so we are done. Return the text.
            const textResponse = result.text;
            if (textResponse) {
                return textResponse;
            }
            return "I'm not sure how to respond to that. Can you try asking in a different way?";
        }
        
        // Add the AI's tool request to history
        history.push(output);
        
        const toolRequest = toolRequestPart.toolRequest;
        
        // The AI might pass the whole object or just the string ID.
        const toolInput = typeof toolRequest.input === 'string' 
            ? toolRequest.input
            : (toolRequest.input as { resourceId: string }).resourceId;

        const toolResult = await getResource(toolInput);

        const toolResponsePart = toolResponse(toolRequest.name, toolResult);
        
        // Add the tool's response to history for the next turn
        history.push({ role: 'tool', content: [toolResponsePart] });
        
        // Continue the conversation with the new history
        result = await prompt({ history });
    }
}
