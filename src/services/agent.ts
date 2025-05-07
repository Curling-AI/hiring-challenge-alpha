import { AIMessageChunk, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { getCurlInfo } from "../services/curlCall";
import { getAllDocuments, getDocumentFileNames } from "../services/documentLoader";
import { WebSocket } from "ws";
import { executeQuery, buildDatabaseSchemas } from "../services/sqliteLoader";

export const generateAiResponse = async (
  model: ChatGoogleGenerativeAI,
  message: string,
  conversationHistory: (HumanMessage | SystemMessage | AIMessageChunk)[],
  socket: WebSocket
): Promise<AIMessageChunk> => {
  const curlTool = new DynamicStructuredTool({
    name: "curl_web_content",
    description: `
      Use this tool to fetch live data from websites or APIs based on the user's request.

      You must infer the correct URL from the user's message. The user will NOT give a URL.
      Only use URLs you are confident exist, such as public REST APIs or simple site endpoints.

      If you're unsure of the exact API format, either skip calling the tool or use a general URL like a homepage or documentation page.

      Do not fabricate API paths that don't exist.
    `,
    schema: z.object({
      url: z.string().describe("The direct URL you constructed from the user's query"),
    }),
    func: async ({ url }) => {
      try {
        const data = await getCurlInfo(url, socket);
        return `Fetched data from ${url}:\n${data}`;
      } catch (e) {
        return `Failed to fetch data from ${url}: ${e}`;
      }
    },
  });

  const documentSearch = new DynamicStructuredTool({
    name: "search_documents",
    description: `
      Searches through internal offline documents based on a keyword or phrase.
      
      The user might speak in Portuguese or another language, but your search query must always be in ENGLISH, as the documents are written in English.
      
      Use this tool only if the user asks about something that could reasonably exist in local/internal documents (e.g., policies, processes, reports, notes).
      
      Documents filenames:
      ${JSON.stringify(getDocumentFileNames())}

      Infer meaningful English keywords or phrases from the user's message and pass it as the "query".
    `,
    schema: z.object({
      query: z.string().describe("A keyword or phrase to look for in the documents."),
    }),
    func: async ({ query }) => {
      try {
        const documents = await getAllDocuments();
        const matches = documents.filter(doc =>
          doc.toLowerCase().includes(query.toLowerCase())
        );
        if (matches.length === 0) {
          return `No relevant results found in the documents for: "${query}"`;
        }
        return `Found the following relevant document content:\n${matches.join("\n---\n")}`;
      } catch (e) {
        return `Documents query error: ${e}`;
      }

    },
  });

  const sqliteTool = new DynamicStructuredTool({
    name: "query_sqlite_database",
    description: `
      Executes SQL queries against SQLite databases to retrieve structured data.
      
      Use this tool when the user is asking for specific data that would likely be stored in a database,
      such as records, statistics, or structured information.
      
      You need to specify both the database name and a valid SQL query.

      Available databases and their schemas:
      ${JSON.stringify(await buildDatabaseSchemas())}
      
      Only use SELECT queries for safety reasons.
      Make sure to use the correct table names and column names from the schema information.
    `,
    schema: z.object({
      database: z.string().describe("The name of the database file to query (must end with .db)"),
      query: z.string().describe("A valid SQL SELECT query to execute against the database"),
    }),
    func: async ({ database, query }) => {
      try {
        if (!query.trim().toLowerCase().startsWith('select')) {
          return "For security reasons, only SELECT queries are allowed.";
        }
        
        const results = await executeQuery(database, query);
        return JSON.stringify(results);
      } catch (e) {
        return `Database query error: ${e}`;
      }
    },
  });

  const systemPrompt = new SystemMessage(`
    chat history: ${JSON.stringify(conversationHistory)}

    You are an intelligent assistant. 
    You can answer questions, fetch real-time data using tools, search documents, and query databases.
    Think step-by-step to determine whether you need to use a tool.
    If you do, call the appropriate tool and wait for the result.
    Then, respond with a clear and helpful answer to the user.
  `.trim());

  const tools = [curlTool, documentSearch, sqliteTool];
  const llmWithTools = model.bindTools(tools);

  const aiAnswer = await llmWithTools.invoke([
    systemPrompt,
    new HumanMessage(message),
  ]);

  if (Array.isArray(aiAnswer.content)) {
    const functionCall = aiAnswer.content.find(
      (c) => typeof c === "object" && "functionCall" in c
    );
    if (functionCall && "functionCall" in functionCall) {
      const { name, args } = functionCall.functionCall;
      const tool = tools.find(t => t.name === name);
      if (!tool) {
        return new AIMessageChunk({ content: `Tool "${name}" not found.` });
      }

      const result = await tool.func(args);
      const finalAnswer = await model.invoke([
        new SystemMessage(`
          based on the result of the used tool: ${result}
          answer the user's question.
        `.trim()),
        new HumanMessage(message),
      ]);

      return new AIMessageChunk({ content: finalAnswer.content });
    }
  }

  return aiAnswer;
};
