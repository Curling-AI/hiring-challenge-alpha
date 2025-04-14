import { ChatOpenAI } from "@langchain/openai";
import dotenv from 'dotenv';

dotenv.config();

// Configura o modelo de linguagem utilizado pelo agente

export const llm = new ChatOpenAI({
    modelName: "openai/gpt-3.5-turbo",
    temperature: 0.2,
    apiKey: process.env.LLM_API_KEY,
    configuration: {
        baseURL: process.env.LLM_BASE_URL,
    },
    max_tokens: 4000,
});