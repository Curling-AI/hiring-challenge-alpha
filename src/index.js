import { rl } from './cli/rl.js'
import { runAgent } from './agent/agent.js';

// Inicializa o agente e o loop de interação

console.log('Ask your question or type "exit" to quit.\n');

const askQuestion = () => {
  rl.question('Question (type "exit" to quit): ', async (question) => {
    if (question.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    try {
      const response = await runAgent(question);
      console.log('\nAnswer:\n', response + '\n');
    } catch (err) {
      console.error('Erro ao executar:', err);
    }

    askQuestion();
  });
};

askQuestion();
