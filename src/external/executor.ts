import { exec } from 'child_process';
import { promisify } from 'util';
import { CommandExecutor, CommandConfig, CommandResult } from './types.js';

const execAsync = promisify(exec);

export class BashCommandExecutor implements CommandExecutor {
  private config: CommandConfig;
  private approvalCallback?: (command: string) => Promise<boolean>;

  constructor(config: CommandConfig) {
    this.config = config;
  }

  validate(command: string): boolean {
    const commandBase = command.split(' ')[0];
    return this.config.allowedCommands.includes(commandBase);
  }

  setApprovalCallback(callback: (command: string) => Promise<boolean>) {
    this.approvalCallback = callback;
  }

  async execute(command: string): Promise<CommandResult> {
    try {
      if (!this.validate(command)) {
        return {
          success: false,
          error: `Comando não permitido: Apenas os seguintes comandos são permitidos: ${this.config.allowedCommands.join(', ')}`,
        };
      }

      if (this.config.requireApproval && this.approvalCallback) {
        const approved = await this.approvalCallback(command);
        if (!approved) {
          return {
            success: false,
            error: 'Comando não aprovado pelo usuário',
          };
        }
      }

      const { stdout, stderr } = await execAsync(command);
      
      return {
        success: true,
        output: stdout,
        error: stderr || undefined,
        exitCode: 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        exitCode: error instanceof Error && 'code' in error ? Number(error.code) : 1,
      };
    }
  }
}

export function createCommandExecutor(config: CommandConfig): CommandExecutor {
  return new BashCommandExecutor(config);
} 