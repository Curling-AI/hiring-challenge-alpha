import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { WebSocket } from "ws";
import { generateAiResponse } from "../services/agent";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export const AiChatController = async (connection: WebSocket, model: ChatGoogleGenerativeAI) => {
    const conversationHistory: (HumanMessage | SystemMessage | AIMessage)[] = [];
    connection.on('message', async (message: string) => {
        try {
            const parsedMessage: {content: string, type: string} = JSON.parse(String(message));

            if(parsedMessage.type === "approval") return
            const userMessage = new HumanMessage(parsedMessage.content);
            conversationHistory.push(userMessage);

            const response = await generateAiResponse(model, parsedMessage.content, conversationHistory, connection)
            connection.send(JSON.stringify({
                type: response.getType(),
                content: response.content
            }));
        } catch (error) {
            console.log(error)
            connection.send(JSON.stringify({
                type: 'error',
                content: 'Sorry, I encountered an error processing your request.'
            }));
        }
    });
    
    connection.on('close', () => {
        console.log('WebSocket connection closed');
    });
}