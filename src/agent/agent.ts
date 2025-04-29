import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { 
    DatabaseTool, 
    SearchContentTool, 
    ReadDocumentTool, 
    CommandTool, 
    ListFilesTool
} from "./tools.js";
import { createConnection } from "../database/sqlite.js";
import { createDocumentProcessor } from "../documents/processor.js";
import { createCommandExecutor } from "../external/executor.js";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import fs from 'fs/promises';

const SQLITE_DIR = process.env.SQLITE_DIR || "./data/sqlite";
const DOCUMENTS_DIR = process.env.DOCUMENTS_DIR || "./data/documents";

async function ensureDirectoriesExist() {
    const dirs = [SQLITE_DIR, DOCUMENTS_DIR];
    
    for (const dir of dirs) {
        try {
            await fs.access(dir);
        } catch (error) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (mkdirError) {
                throw new Error(`Erro ao criar diretório ${dir}: ${mkdirError}`);
            }
        }
    }
}

class CustomAgent {
    private model: ChatGoogleGenerativeAI;
    private tools: any[];
    private toolMap: Map<string, any>;
    
    constructor(model: ChatGoogleGenerativeAI, tools: any[]) {
        this.model = model;
        this.tools = tools;
        this.toolMap = new Map();
        
        tools.forEach(tool => {
            this.toolMap.set(tool.name, tool);
        });
    }
    
    private getResponseInLanguage(language: string): string {
        if (language === 'pt') {
            return "Responda em português brasileiro, de forma clara e concisa.";
        } else if (language === 'es') {
            return "Responda en español, de forma clara y concisa.";
        } else if (language === 'fr') {
            return "Répondez en français, de manière claire et concise.";
        } else {
            return "Answer in English, in a clear and concise manner.";
        }
    }
    
    async invoke({ input, chat_history = [] }: { 
        input: string, 
        chat_history?: BaseMessage[] 
    }): Promise<any> {
        const language = await detectLanguage(input, this.model);

        const historyContext = chat_history.length > 0 
            ? "Conversa anterior: " + chat_history.slice(-3).map(m => m.content).join(" | ")
            : "";
        
        const toolsDescription = this.tools.map(tool => 
            `- ${tool.name}: ${tool.description}`
        ).join('\n');
        
        const toolSelectionPrompt = `
${historyContext}

FERRAMENTAS DISPONÍVEIS:
${toolsDescription}

PERGUNTA DO USUÁRIO: ${input}

Qual ferramenta devo usar para responder esta pergunta? Analise a questão e selecione a ferramenta mais adequada.
Se a pergunta for sobre dados em um banco de dados, a melhor ferramenta é "query_database".
Se a pergunta mencionar "tabelas", "artistas", "músicas", ou outros termos relacionados a bancos de dados, considere usar "query_database".

Responda apenas com o nome da ferramenta ou "nenhuma" se nenhuma ferramenta for necessária.
`;

        const toolSelectionResponse = await this.model.invoke(toolSelectionPrompt);
        const toolName = this.extractToolName(String(toolSelectionResponse.content));
        
        if (!toolName || toolName === "nenhuma") {
            const directResponse = await this.model.invoke(`
${historyContext}
PERGUNTA DO USUÁRIO: ${input}

${this.getResponseInLanguage(language)} 
Lembre-se que você não tem acesso aos documentos, bancos de dados ou comandos externos neste momento.
`);
            
            return {
                output: String(directResponse.content),
                intermediateSteps: [],
                sources: []
            };
        }
        
        if (toolName && this.toolMap.has(toolName)) {
            const tool = this.toolMap.get(toolName);
            
            const params = await this.generateToolParameters(toolName, input);

            if (!params) {
                return {
                    output: `Não foi possível gerar parâmetros válidos para a ferramenta ${toolName}. Por favor, reformule sua pergunta.`,
                    intermediateSteps: [],
                    sources: []
                };
            }
            
            let toolResult = '';
            const sources: string[] = [];
            
            try {
                toolResult = await tool.call(params);
                
                if (toolName === 'query_database' && params.action === 'list_tables') {
                    const perguntaSimples = input.toLowerCase();
                    const entidadePergunta = this.extrairEntidadeDaPergunta(perguntaSimples);
                    const arquivoBD = params.fileName;
                    
                    if (entidadePergunta && arquivoBD) {
                        const tablesMatch = toolResult.match(/Tables in [^:]+: (.*)/);
                        const tabelasDisponiveis = tablesMatch ? tablesMatch[1].split(', ') : [];
                        
                        const tabelaAlvo = this.encontrarTabelaParaEntidade(tabelasDisponiveis, entidadePergunta);
                        
                        if (tabelaAlvo) {
                            const queryParams = {
                                action: "sql_query" as const,
                                fileName: arquivoBD,
                                query: `SELECT * FROM ${tabelaAlvo} LIMIT 20`
                            };
                            
                            const queryResult = await tool.call(queryParams);
                            toolResult += "\n\n" + queryResult;
                        }
                    }
                }
                
                if (toolName === 'query_database' && params.fileName) {
                    sources.push(params.fileName);
                } else if (toolName === 'read_document' && params.input) {
                    sources.push(params.input);
                }
                
                this.extractSourcesFromText(toolResult, sources);
                    
                const finalPrompt = `
${historyContext}

PERGUNTA DO USUÁRIO: ${input}

Ferramenta utilizada: ${toolName}
Resultado da ferramenta: ${toolResult}

Baseado no resultado acima, responda à pergunta do usuário de forma clara e direta.
${this.getResponseInLanguage(language)}
Se o resultado da ferramenta contiver dados de uma consulta SQL, organize-os de forma legível para o usuário.
Se o resultado inclui uma lista de registros, apresente os dados principais de cada registro de forma clara.
`;

                const finalResponse = await this.model.invoke(finalPrompt);
                
                return {
                    output: String(finalResponse.content),
                    intermediateSteps: [{
                        action: { tool: toolName, toolInput: params },
                        observation: toolResult
                    }],
                    sources
                };
            } catch (error: any) {
                console.error(`[CustomAgent] Erro ao executar ferramenta:`, error);
                
                const errorPrompt = `
PERGUNTA DO USUÁRIO: ${input}

Houve um erro ao tentar usar a ferramenta ${toolName}: ${error.message}

Explique de forma simples esse erro ao usuário e sugira alguma alternativa.
${this.getResponseInLanguage(language)}
`;
                const errorResponse = await this.model.invoke(errorPrompt);
                
                return {
                    output: String(errorResponse.content),
                    intermediateSteps: [{
                        action: { tool: toolName, toolInput: params },
                        observation: `Erro: ${error.message}`
                    }],
                    sources: []
                };
            }
        }
        
        return {
            output: `Não foi possível processar sua solicitação com a ferramenta "${toolName}". Por favor, tente reformular sua pergunta.`,
            intermediateSteps: [],
            sources: []
        };
    }
    
    private extractToolName(text: string): string | null {
        const cleaned = text.trim().toLowerCase();
        const firstLine = cleaned.split('\n')[0].trim();
        
        for (const toolName of this.toolMap.keys()) {
            if (firstLine.includes(toolName)) {
                return toolName;
            }
        }
        
        const firstWord = firstLine.split(' ')[0].trim();
        if (firstWord.length < 20 && this.toolMap.has(firstWord)) {
            return firstWord;
        }
        
        if (firstLine.includes('nenhuma') || firstLine.includes('none')) {
            return "nenhuma";
        }
        
        return null;
    }
    
    private extractJSON(text: string): any {
        try {
            const codeBlockRegex = /```(?:json)?([\s\S]*?)```/;
            const match = text.match(codeBlockRegex);
            
            let jsonContent = match ? match[1].trim() : text.trim();
            
            const jsonStartIndex = jsonContent.indexOf('{');
            const jsonEndIndex = jsonContent.lastIndexOf('}');
            
            if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                jsonContent = jsonContent.substring(jsonStartIndex, jsonEndIndex + 1);
            }
            
            return JSON.parse(jsonContent);
        } catch (error) {
            console.error("[CustomAgent] Erro ao extrair JSON:", error);
            return null;
        }
    }
    
    private extractSourcesFromText(text: string, sources: string[]): void {
        const patterns = [
            { regex: /Tables in ([a-zA-Z0-9_\-\.]+\.db)/g, group: 1 },
            { regex: /Content of ([a-zA-Z0-9_\-\.]+\.txt)/g, group: 1 },
            { regex: /Found matches .* in .* files: ([a-zA-Z0-9_\-\.]+)/g, group: 1 }
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                const source = match[pattern.group].trim();
                if (source && !sources.includes(source)) {
                    sources.push(source);
                }
            }
        });
    }
    
    private async generateToolParameters(toolName: string, question: string): Promise<any> {
        const tool = this.toolMap.get(toolName);
        
        let parameterDesc = '';
        
        if (toolName === 'query_database') {
            const perguntaSimples = question.toLowerCase();
            const perguntaSobreDados = 
                perguntaSimples.includes('quais') || 
                perguntaSimples.includes('listar') || 
                perguntaSimples.includes('mostrar') ||
                perguntaSimples.includes('lista') ||
                perguntaSimples.includes('ver') ||
                perguntaSimples.includes('exibir');
            
            const refereBD = perguntaSimples.includes('.db') || perguntaSimples.includes('banco de dados');
            
            if (perguntaSobreDados && refereBD) {
                const entidadePergunta = this.extrairEntidadeDaPergunta(perguntaSimples);
                const arquivoBD = this.extrairArquivoBD(perguntaSimples);
                
                if (entidadePergunta && arquivoBD) {
                    const mapeamentoEntidades: Record<string, string[]> = {
                        'artista': ['Artist', 'Artists'],
                        'música': ['Track', 'Tracks', 'Song', 'Songs'],
                        'álbum': ['Album', 'Albums'],
                        'gênero': ['Genre', 'Genres']
                    };
                    
                    const possiveisTabelasPorEntidade = mapeamentoEntidades[entidadePergunta] || [entidadePergunta];
                    const tabelaProvavel = possiveisTabelasPorEntidade[0];
                    
                    return {
                        action: "sql_query",
                        fileName: arquivoBD,
                        query: `SELECT * FROM ${tabelaProvavel} LIMIT 20`
                    };
                }
            }
            
            parameterDesc = `
Para a ferramenta query_database, os parâmetros são:
- action: "list_tables" para listar tabelas ou "sql_query" para executar consultas
- fileName: nome do arquivo de banco de dados (exemplo: "music.db")
- query: (apenas se action=sql_query) a consulta SQL a executar

IMPORTANTE: Se a pergunta for sobre dados específicos como "quais artistas", "listar músicas", etc, você DEVE usar "sql_query" diretamente em vez de apenas listar tabelas. Para isso:
1. Identifique o nome do banco de dados na pergunta (ex: music.db)
2. Identifique a entidade que o usuário quer ver (ex: artistas -> tabela Artist ou artists)
3. Gere uma consulta SQL como "SELECT * FROM Artist LIMIT 20"

A ferramenta é inteligente e consegue encontrar tabelas com nomes semelhantes mesmo se houver diferença entre singular/plural.

Exemplo 1 - Para listar tabelas:
{"action": "list_tables", "fileName": "music.db"}

Exemplo 2 - Para uma pergunta como "Quais artistas em music.db?":
{"action": "sql_query", "fileName": "music.db", "query": "SELECT * FROM Artist LIMIT 20"}
`;
        } else if (toolName === 'search_content') {
            parameterDesc = `
Para a ferramenta search_content, o parâmetro é:
- input: o termo ou frase para buscar nos documentos
Exemplo: {"input": "termo de busca"}
`;
        } else if (toolName === 'read_document') {
            parameterDesc = `
Para a ferramenta read_document, o parâmetro é:
- input: nome do arquivo de documento a ser lido
Exemplo: {"input": "nome_do_arquivo.txt"}
`;
        } else if (toolName === 'execute_command') {
            parameterDesc = `
Para a ferramenta execute_command, o parâmetro é:
- command: o comando bash a executar
Exemplo: {"command": "curl -s https://exemplo.com"}
`;
        } else if (toolName === 'list_files') {
            parameterDesc = `
A ferramenta list_files não requer parâmetros.
Retorne um objeto vazio: {}
`;
        }
        
        const paramsPrompt = `
Ferramenta selecionada: ${toolName}
Descrição: ${tool.description}

${parameterDesc}

PERGUNTA DO USUÁRIO: ${question}

Gere APENAS o objeto JSON com os parâmetros corretos para a ferramenta ${toolName}, sem texto adicional.
Use EXATAMENTE os nomes de parâmetros especificados acima.
`;

        const paramsResponse = await this.model.invoke(paramsPrompt);
        const rawParams = String(paramsResponse.content);
        return this.extractJSON(rawParams);
    }

    private extrairEntidadeDaPergunta(pergunta: string): string | null {
        const entidades = [
            {nome: 'artista', variações: ['artista', 'artistas', 'músico', 'músicos', 'banda', 'bandas', 'cantor', 'cantores']},
            {nome: 'música', variações: ['música', 'músicas', 'canção', 'canções', 'track', 'tracks', 'song', 'songs']},
            {nome: 'álbum', variações: ['álbum', 'álbuns', 'album', 'albums', 'disco', 'discos']},
            {nome: 'gênero', variações: ['gênero', 'gêneros', 'genero', 'generos', 'estilo', 'estilos']}
        ];
        
        for (const entidade of entidades) {
            for (const variacao of entidade.variações) {
                if (pergunta.includes(variacao)) {
                    return entidade.nome;
                }
            }
        }
        
        return null;
    }

    private extrairArquivoBD(pergunta: string): string | null {
        const matchDB = pergunta.match(/([a-zA-Z0-9_]+\.db)/i);
        
        if (matchDB) {
            return matchDB[1];
        }
        
        const bdConhecidos = ['music.db', 'chinook.db', 'northwind.db'];
        
        for (const bd of bdConhecidos) {
            if (pergunta.includes(bd.replace('.db', '')) || pergunta.toLowerCase().includes(bd)) {
                return bd;
            }
        }
        
        return null;
    }

    private encontrarTabelaParaEntidade(tabelas: string[], entidade: string): string | null {
        const mapeamentoEntidades: Record<string, string[]> = {
            'artista': ['artist', 'artists', 'performer', 'performers', 'musician', 'musicians', 'banda', 'band'],
            'música': ['track', 'tracks', 'song', 'songs', 'musica', 'musicas', 'música', 'músicas'],
            'álbum': ['album', 'albums', 'disco', 'discos', 'álbum', 'álbuns'],
            'gênero': ['genre', 'genres', 'genero', 'generos', 'gênero', 'gêneros', 'style', 'styles']
        };
        
        const possiveisTabelasPorEntidade = mapeamentoEntidades[entidade] || [];
        
        for (const tabela of tabelas) {
            const tabelaLower = tabela.toLowerCase();
            
            if (possiveisTabelasPorEntidade.includes(tabelaLower)) {
                return tabela;
            }
        }
        
        let melhorTabela = null;
        let menorDistancia = Infinity;
        
        for (const tabela of tabelas) {
            const tabelaLower = tabela.toLowerCase();
            
            for (const possivel of possiveisTabelasPorEntidade) {
                const distancia = this.levenshteinDistance(tabelaLower, possivel);
                if (distancia < menorDistancia) {
                    menorDistancia = distancia;
                    melhorTabela = tabela;
                }
            }
        }
        
        return menorDistancia <= 3 ? melhorTabela : null;
    }

    private levenshteinDistance(a: string, b: string): number {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        
        const matrix = [];
        
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, 
                        matrix[i][j - 1] + 1,     
                        matrix[i - 1][j] + 1      
                    );
                }
            }
        }
        
        return matrix[b.length][a.length];
    }
}

async function initAgent() {
    await ensureDirectoriesExist();

    const dbConnection = await createConnection({ path: SQLITE_DIR });
    const docProcessor = createDocumentProcessor({ path: DOCUMENTS_DIR });
    const cmdExecutor = createCommandExecutor({ 
        allowedCommands: ['curl'], 
        requireApproval: false 
    });
    
    const tools = [ 
        new ListFilesTool(SQLITE_DIR, DOCUMENTS_DIR),
        new DatabaseTool(dbConnection),
        new SearchContentTool(docProcessor),
        new ReadDocumentTool(docProcessor),
        new CommandTool(cmdExecutor)
    ];

    const model = new ChatGoogleGenerativeAI({
        model: "gemini-1.5-pro-latest",
        temperature: 0.2,
        apiKey: process.env.GEMINI_API_KEY,
        maxOutputTokens: 1024
    });

    const agent = new CustomAgent(model, tools);

    return agent;
}

let agentExecutorInstance: any = null;

export async function getAgentExecutor(): Promise<any> {
    if (!agentExecutorInstance) {
        agentExecutorInstance = await initAgent();
    }
    return agentExecutorInstance;
}

function formatChatHistory(history: { type: 'user' | 'agent', content: string }[]): BaseMessage[] {
  return history.map(msg => {
    if (msg.type === 'user') {
      return new HumanMessage(msg.content);
    } else {
      return new AIMessage(msg.content);
    }
  });
}

async function detectLanguage(text: string, model: ChatGoogleGenerativeAI): Promise<string> {
    const langPrompt = `
Identifique o idioma da seguinte mensagem. Responda apenas com o código ISO do idioma (exemplo: "en" para inglês, "pt" para português, "es" para espanhol, "fr" para francês). Não adicione texto extra.

Mensagem: "${text}"

Código do idioma:
`;

    try {
        const response = await model.invoke(langPrompt);
        const language = String(response.content).trim().toLowerCase();
        const languageCode = language.match(/^([a-z]{2})/i);
        return languageCode ? languageCode[1] : 'en';
    } catch (error) {
        return 'en';
    }
}

export async function runAgent(question: string, history: { type: 'user' | 'agent', content: string }[] = []) {
    try {
        const agent = await getAgentExecutor();
        const chatHistory = formatChatHistory(history);

        const result = await agent.invoke({
             input: question, 
            chat_history: chatHistory
        });

        const answer = typeof result.output === 'string' 
            ? result.output 
            : "Não foi possível gerar uma resposta.";
        
        return { 
            success: true, 
            answer, 
            sources: result.sources || []
        };
    } catch (error: any) {
        let errorMessage = "Ocorreu um erro ao processar sua pergunta.";
        
        if (error.message) {
            if (error.message.includes("429") || error.message.includes("quota") || 
                error.message.includes("Too Many Requests") || error.message.includes("exceeded")) {
                errorMessage = "Limite diário de consultas atingido. Por favor, tente novamente amanhã ou considere atualizar para um plano pago.";
            } else if (error.message.includes("API")) {
                errorMessage = "Erro de comunicação com a API. Verifique sua conexão e tente novamente.";
            }
        }
        
        return { 
            success: false, 
            answer: errorMessage, 
            sources: [],
            error: error.message || "Erro desconhecido" 
        };
    }
} 