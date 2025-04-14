import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { llm } from "./llm.js";
import { tools } from "../tools/index.js";
import { prompt } from "./prompt.js";

// Cria e configura o executor do agente, armazenando o histórico de conversas

let executor;
let conversationHistory = [];

const setupAgentExecutor = async () => {
    const agent = createToolCallingAgent({
        llm,
        tools,
        prompt,
    });

    executor = new AgentExecutor({
        agent,
        tools,
        verbose: false,
    });
};

export const runAgent = async (input) => {
    if (!executor) {
        await setupAgentExecutor();
    }
    conversationHistory.push({ role: "user", content: input });

    const result = await executor.invoke({ input, chat_history: conversationHistory,});

    conversationHistory.push({ role: "assistant", content: result.output });
    return result.output;
};
