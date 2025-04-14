import readline from 'readline';

// Interface de linha de comando para interagir com o agente
export const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
