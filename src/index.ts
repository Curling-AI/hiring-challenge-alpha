import dotenv from 'dotenv';
import { runAgent, setGlobalCommandExecutor } from './agent/agent.js';
import readline from 'readline/promises';
import chalk from 'chalk';
import { createCommandExecutor } from './external/executor.js';
import { BashCommandExecutor } from './external/executor.js';

dotenv.config();

let rl: readline.Interface;

function formatErrors(erro: any): string {
  const mensagemErro = String(erro);
  
  if (mensagemErro.includes('429 Too Many Requests') || 
      mensagemErro.includes('exceeded your current quota')) {
    return 'Limite diário de consultas atingido. Por favor, tente novamente amanhã ou considere atualizar para um plano pago.';
  }
  
  if (mensagemErro.includes('API key')) {
    return 'Problema com a chave de API. Verifique se sua chave API está configurada corretamente no arquivo .env';
  }

  if (mensagemErro.includes('ECONNREFUSED') || 
      mensagemErro.includes('network') || 
      mensagemErro.includes('connect')) {
    return 'Erro de conexão. Verifique sua conexão com a internet e tente novamente.';
  }
  
  return 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.';
}

async function requestCommandApproval(command: string): Promise<boolean> {
  console.log('\n' + chalk.yellow('⚠️  Solicitação para executar comando:'));
  console.log(chalk.yellow(`   ${command}`));
  
  const response = await rl.question(chalk.yellow('Aprovar execução? (s/n): '));
  return response.toLowerCase() === 's' || response.toLowerCase() === 'sim';
}

async function main() {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('CLI: GEMINI_API_KEY not defined in .env');
    }

    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const cmdExecutor = createCommandExecutor({ 
      allowedCommands: ['curl', 'ls', 'cat', 'grep', 'find'], 
      requireApproval: true 
    }) as BashCommandExecutor;
    
    cmdExecutor.setApprovalCallback(requestCommandApproval);

    setGlobalCommandExecutor(cmdExecutor);

    let history: { type: 'user' | 'agent'; content: string }[] = [];

    const askQuestion = async () => {
      console.log("\n" + chalk.bold.blue("Bem-vindo ao use.AI!"));
      console.log(chalk.blue("Faça sua pergunta ou digite 'sair' para encerrar a conversa."));
      console.log(chalk.gray("Dica: Você pode solicitar ao agente para usar curl para buscar informações na internet."));
      console.log(chalk.gray("      Exemplo: \"Busque o clima atual em São Paulo usando curl\""));

      while (true) {
        const question = await rl.question('\n' + chalk.green('Você: '));
        if (question.trim().toLowerCase() === 'sair') {
          break;
        }

        console.log(chalk.yellow('Agente: Pensando...'));
        
        try {
          const result = await runAgent(question, history);

          if (result.success) {
            console.log(chalk.cyan(`Agente: ${result.answer}`));
            if (result.sources && result.sources.length > 0) {
              console.log(chalk.gray('Fontes:'));
              result.sources.forEach((source: string) => console.log(chalk.gray(`- ${source}`)));
            }
            history.push({ type: 'user', content: question });
            history.push({ type: 'agent', content: result.answer });
          } else {
            console.error('\n' + chalk.red('❌ Erro: ') + chalk.red(formatErrors(result.error)));
          }
        } catch (error) {
          console.error('\n' + chalk.red('❌ Erro: ') + chalk.red(formatErrors(error)));
        }

        if (history.length > 10) {
          history = history.slice(-10);
        }
      }
      console.log('\n' + chalk.blue('Saindo... Até mais!'));
      rl.close();
    };

    askQuestion(); 

  } catch (error) {
    console.error('\n' + chalk.red('❌ Erro ao iniciar o CLI: ') + chalk.red(formatErrors(error)));
    
    process.exit(1);
  }
}

main(); 