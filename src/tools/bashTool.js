import { exec } from 'child_process';
import { rl } from '../cli/rl.js'

// Ferramenta que permite ao agente executar comandos bash simulados via Node

function askPermission(command) {
  return new Promise((resolve) => {
    rl.question(
      `\nThe agent wants to execute the command:\n"${command}"\nDo you allow it? (y/n): `,
      (answer) => {
        resolve(answer.trim().toLowerCase() === 'y');
      }
    );
  });
}

export async function runBashCommand(command) {
  const isAllowed = await askPermission(command);

  if (!isAllowed) {
    return "Command not accepted by user.";
  }

  return new Promise((resolve, reject) => {
    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error when executing command: ${stderr || error.message}`);
      }
      resolve(stdout.trim());
    });
  });
}
