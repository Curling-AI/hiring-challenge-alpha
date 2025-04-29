export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  exitCode?: number;
}

export interface CommandExecutor {
  execute: (command: string) => Promise<CommandResult>;
  validate: (command: string) => boolean;
  setApprovalCallback?: (callback: (command: string) => Promise<boolean>) => void;
}

export interface CommandConfig {
  allowedCommands: string[];
  requireApproval: boolean;
} 