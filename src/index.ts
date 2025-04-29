import dotenv from 'dotenv';
import { runAgent } from './agent/agent.js';
import readline from 'readline/promises';
import chalk from 'chalk';

dotenv.config();


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

async function main() {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('CLI: GEMINI_API_KEY not defined in .env');
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    let history: { type: 'user' | 'agent'; content: string }[] = [];

    const askQuestion = async () => {
      console.log("\n" + chalk.bold.blue("Bem-vindo ao use.AI!"));
      console.log(chalk.blue("Faça sua pergunta ou digite 'sair' para encerrar a conversa."));

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