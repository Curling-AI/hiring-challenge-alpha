import { exec } from 'child_process';
import { promisify } from 'util';
import { CommandExecutor, CommandConfig, CommandResult } from './types.js';

const execAsync = promisify(exec);

export class BashCommandExecutor implements CommandExecutor {
  private config: CommandConfig;

  constructor(config: CommandConfig) {
    this.config = config;
  }

  validate(command: string): boolean {
    const commandBase = command.split(' ')[0];
    return this.config.allowedCommands.includes(commandBase);
  }

  async execute(command: string): Promise<CommandResult> {
    try {
      if (!this.validate(command)) {
        return {
          success: false,
          error: 'Command not allowed',
        };
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