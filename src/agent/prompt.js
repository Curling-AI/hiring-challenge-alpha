import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

// Define o prompt base que orienta o comportamento do agente

export const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant."],
    new MessagesPlaceholder("chat_history"),
    ["placeholder", "{agent_scratchpad}"],
]);
