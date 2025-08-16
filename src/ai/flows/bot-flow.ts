
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
    description: 'Returns the details of a resource given its ID. The tool will return details of the resource if found, or null if not found. The AI should handle the case where the resource is not found and inform the user.',
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
    tools: [getResourceTool],
    system: `You are BT-bot, a friendly and helpful AI assistant for the 'Beyond Theory' application. Your goal is to help users with their productivity and self-improvement journey.

    If the user asks about a specific resource by providing a resource ID, use the getResource tool to fetch its details and provide a helpful summary. When you summarize a resource you found, you MUST include a tag in the format #[title](id) in your response. For example: "Next.js is a great framework. You can learn more here: #[Next.js](nextjs-id)".

    If the resource is not found, you MUST inform the user that it could not be found. Do not make up information about resources.
    
    If the user asks a general question, provide a helpful and encouraging response.`
});


export async function askBot(query: string): Promise<string> {
    const history: AIMessage[] = [{role: 'user', content: [{text: query}]}];
    
    while(true) {
        const {output} = await prompt(history);

        if (output?.content) {
            let text = '';
            output.content.forEach((part: Part) => {
                if(part.text) {
                    text += part.text;
                }
            });

            if(text) {
                return text;
            }
        }
        
        const toolRequestPart = output?.content.find(part => part.toolRequest);
        if (toolRequestPart?.toolRequest) {
            const toolResponsePart = toolResponse(toolRequestPart.toolRequest.name, await getResource(toolRequestPart.toolRequest.input.resourceId));
            history.push(output!);
            history.push({role: 'tool', content: [toolResponsePart]});
            continue;
        }

        return "I'm not sure how to respond to that. Can you try asking in a different way?";
    }
}

