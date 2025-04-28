import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentConfig, AgentContext, AgentResponse, DatabaseTool, DocumentTool, CommandTool } from './types.js';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';

export class MultiSourceAgent {
  private config: AgentConfig;
  private context: AgentContext;
  private agent: Promise<AgentExecutor>;

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = config;
    this.context = context;
    this.agent = this.initializeAgent();
  }

  private async initializeAgent(): Promise<AgentExecutor> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error('API key (apiKey) não fornecida na configuração do agente.');
    }
    const model = this.config.modelName || 'gemini-1.5-flash-latest';

    const llm = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      model: model,
      temperature: this.config.temperature || 0.7,
    });
    console.log(`LLM inicializado com Google Gemini (Modelo: ${model})`);

    const tools: any[] = [];
    console.log('WARN: Agente inicializado SEM ferramentas para teste.');

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', 'Você é um assistente de chat.'],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);

    const agent = await createOpenAIFunctionsAgent({
      llm,
      tools,
      prompt,
    });

    return AgentExecutor.fromAgentAndTools({
      agent,
      tools,
      verbose: true,
    });
  }

  async processQuestion(question: string): Promise<AgentResponse> {
    console.log(`Processando pergunta com Gemini: "${question}"`);
    try {
      const apiKey = this.config.apiKey;
      if (!apiKey) throw new Error('API key (apiKey) não fornecida na configuração do agente.');
      const model = this.config.modelName || 'gemini-1.5-flash-latest';
      console.log(`Usando modelo Gemini em processQuestion: ${model}`);
      const llm = new ChatGoogleGenerativeAI({
        apiKey: apiKey,
        model: model,
        temperature: this.config.temperature || 0.7,
      });
      
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', 'Você é um assistente de chat.'],
        ['human', '{input}']
      ]);
      const chain = prompt.pipe(llm);
      const response = await chain.invoke({ input: question });
      
      return {
        success: true,
        answer: response.content.toString(), 
        sources: [],
      };
    } catch (error) {
      console.error('Erro ao processar pergunta com Gemini:', error);
      return {
        success: false,
        answer: '',
        sources: [],
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }
}

export function createAgent(config: AgentConfig, context: AgentContext): MultiSourceAgent {
  return new MultiSourceAgent(config, context);
} 