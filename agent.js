import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { END, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph';
import { ChatGroq } from '@langchain/groq';
import { config } from 'dotenv';

config();

const getDocumentText = tool((input) => {
    if (['The Wealth of Nations', 'The General Theory of Employment, Interest, and Money'].includes(input.book)) {
        return `### The Wealth of Nations (1776)
        Author: Adam Smith
        Summary: Often considered the foundation of modern economic thought, Smith introduced the concept of the "invisible hand" of the market and argued for free trade and market competition. He explained how self-interest in a free-market economy leads to economic prosperity through division of labor, productivity improvements, and efficient resource allocation.
        Key concepts: Division of labor, free markets, self-interest leading to public benefit, laissez-faire economics
        Impact: Formed the foundation of classical economics and promoted free market capitalism as an economic system.`
    } else {
        return "No information available for this book."
    }
}, {
    name: 'get_document_text',
    description: 'Get the text of a book. The input should be the name of the book.',
    schema: z.object({
        book: z.string().describe('The name of the book.'),
    })
})
const tools = [getDocumentText]

const model = new ChatGroq({
    model: process.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0,
    apiKey: process.env.VITE_GROQ_API_KEY,
}).bindTools(tools)

const toolNode = new ToolNode(tools)

const shouldContinue = (state) => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];
    if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
        return "tools";
    }
    return END;
}

const callModel = async (state) => {
    const { messages } = state;
    const response = await model.invoke(messages);
    return { messages: response };
}

const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools", "agent")

export const agent = workflow.compile()