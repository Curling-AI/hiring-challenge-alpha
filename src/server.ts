import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createConnection } from './database/sqlite.js';
import { createDocumentProcessor } from './documents/processor.js';
import { createCommandExecutor } from './external/executor.js';
import { createAgent } from './agent/agent.js';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

try {
  dotenv.config();
} catch (error) {
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let agent: any = null;

async function initializeAgent() {
  try {
    const dbPath = process.env.SQLITE_DB_PATH || './data/sqlite/music.db';
    const dbConnection = await createConnection({ path: dbPath });


    const docsPath = process.env.DOCUMENTS_PATH || './data/documents';
    const documentProcessor = createDocumentProcessor({ path: docsPath });


    const allowedCommands = ['curl', 'wget', 'cat', 'grep'];
    const commandExecutor = createCommandExecutor({
      allowedCommands: allowedCommands,
      requireApproval: true,
    });


    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not defined');
    }

    const agentInstance = createAgent(
      {
        apiKey: geminiApiKey,
        modelName: 'gemini-1.5-flash-latest',
        temperature: 0.7,
      },
      {
        database: dbConnection,
        documents: documentProcessor,
        commands: commandExecutor,
      }
    );
    return agentInstance;

  } catch (error) {
    throw error; 
  }
}

app.post('/api/ask', async (req, res) => {
  try {
    if (!agent) {
      agent = await initializeAgent();
    }

    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'QUESTION NOT PROVIDED' });
    }

    const response = await agent.processQuestion(question);
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