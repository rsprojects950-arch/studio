
'use server';
/**
 * @fileOverview A bot that can answer questions about resources.
 * This bot is designed to be a general conversationalist first,
 * and a resource-fetcher second.
 */

import { ai } from '@/ai/genkit';
import { getResource } from '@/lib/firebase/firestore';
import { z } from 'genkit';

// Define the tool the AI can use to fetch resource details from Firestore.
const getResourceTool = ai.defineTool(
  {
    name: 'getResource',
    description: 'Use this tool ONLY when a user provides a specific resource ID, which looks like #[some-title](some-id), and asks for details. The tool returns the resource details or null if not found.',
    inputSchema: z.object({
      resourceId: z.string().describe('The unique identifier of the resource.'),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    try {
      const id = input.resourceId;
      if (!id) return null;
      return await getResource(id);
    } catch (error) {
      console.error(`[getResourceTool] Failed to fetch resource:`, error);
      // Return null to the AI, so it can respond gracefully to the user.
      return null;
    }
  }
);


// Define the main prompt for the bot.
const botPrompt = ai.definePrompt({
    name: 'botPrompt',
    // Make the tool available to the AI. The AI will decide when to use it.
    tools: [getResourceTool],
    system: `You are BT-bot, a friendly and helpful AI assistant for the 'Beyond Theory' application. Your primary goal is to provide helpful and encouraging responses to users for their productivity and self-improvement questions.

Your secondary function is to fetch details about specific resources.
- If a user's query contains a resource ID in the format #[...](...), you MUST use the getResource tool to fetch its details.
- If the tool returns resource details, summarize them for the user and include a tag in the format #[title](id) in your response. For example: "Next.js is a great framework. You can learn more here: #[Next.js](nextjs-id)".
- If the tool returns null, you MUST inform the user that the resource could not be found. Do not make up information.
- For all other questions, engage in a friendly, helpful conversation.`,
});

/**
 * Handles a user's query by passing it to the AI model.
 * The model will either respond directly or use the getResourceTool if needed.
 * @param query The user's input string.
 * @returns The AI's text response.
 */
export async function askBot(query: string): Promise<string> {
  try {
    // The `.generate()` method handles the entire conversation flow,
    // including any necessary tool calls, in a single step.
    const result = await botPrompt({ input: query });

    // Return the final text content from the AI's response.
    const textResponse = result.text;
    if (textResponse) {
      return textResponse;
    }

    // This is a fallback for the unlikely case that the AI returns no text.
    return "I'm not sure how to respond to that. Can you try asking in a different way?";

  } catch (error) {
    console.error('[askBot] Error during AI generation:', error);
    return "Sorry, I encountered an unexpected error. Please try again.";
  }
}
