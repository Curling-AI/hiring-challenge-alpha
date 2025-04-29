import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createConnection } from './database/sqlite.js';
import { createDocumentProcessor } from './documents/processor.js';
import { createCommandExecutor } from './external/executor.js';
import { runAgent } from './agent/agent.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, AIMessage } from "@langchain/core/messages";

try {
  dotenv.config();
} catch (error) {
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.post('/api/ask', async (req, res) => {
  try {
    const { question, history } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'QUESTION NOT PROVIDED' });
    }

    const formattedHistory = (history || []).map((msg: any) => { 
        if (msg.type === 'user') {
            return new HumanMessage(msg.content);
        } else if (msg.type === 'agent') {
            return new AIMessage(msg.content);
        } else {
            return null;
        }
    }).filter((msg: any) => msg !== null);

    const response = await runAgent(question, formattedHistory);
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      error: 'ERROR PROCESSING QUESTION',
      details: error instanceof Error ? error.message : 'UNKNOWN ERROR'
    });
  }
});

app.get('/api/test-llm', async (req, res) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not defined' });
    }


    const model = 'gemini-1.5-flash-latest';
    const llm = new ChatGoogleGenerativeAI({
      apiKey: geminiApiKey,
      model: model,
      temperature: 0.7,
    });

    const result = await llm.invoke("Hi, Gemini!");
    res.json({ success: true, response: result.content.toString() });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error in LLM test';
    const status = (error as any)?.status || 500;
    res.status(status).json({ 
      error: 'Error testing LLM directly (Gemini)',
      details: errorMessage,
      statusCode: status
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 