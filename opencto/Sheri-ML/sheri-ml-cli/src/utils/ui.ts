/**
 * CLI UI Components — Better visual feedback
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';
import { colors, symbols } from './colors';

export interface TaskProgress {
  spinner: Ora;
  startTime: number;
}

export function startTask(message: string): TaskProgress {
  const spinner = ora({
    text: colors.muted(`${symbols.strawberry} ${message}`),
    color: 'red',
  }).start();

  return {
    spinner,
    startTime: Date.now(),
  };
}

export function updateTask(task: TaskProgress, message: string) {
  task.spinner.text = colors.muted(`${symbols.strawberry} ${message}`);
}

export function completeTask(task: TaskProgress, message: string) {
  const duration = Date.now() - task.startTime;
  task.spinner.succeed(
    colors.success(`${symbols.check} ${message}`) +
      colors.muted(` (${formatDuration(duration)})`)
  );
}

export function failTask(task: TaskProgress, message: string) {
  task.spinner.fail(colors.error(`${symbols.cross} ${message}`));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function showPrompt(text: string = 'you'): string {
  return colors.cherryRed(`${symbols.strawberry} ${text} ${symbols.arrow}`);
}

export function showResponse(name: string = 'sheri', meta?: string): void {
  let line = `\n${colors.cherryRed.bold(`${symbols.strawberry} ${name}`)}`;
  if (meta) {
    line += colors.muted(`  ${meta}`);
  }
  console.log(line);
}

export function showSection(title: string): void {
  console.log(`\n${colors.peach.bold(title)}`);
}

export function showError(message: string): void {
  console.log(colors.error(`\n  ${symbols.cross} ${message}\n`));
}

export function showSuccess(message: string): void {
  console.log(colors.success(`\n  ${symbols.check} ${message}\n`));
}

export function showWarning(message: string): void {
  console.log(colors.warning(`\n  ${symbols.warning} ${message}\n`));
}

export function showInfo(message: string): void {
  console.log(colors.info(`\n  ${symbols.dot} ${message}\n`));
}

export function showBox(content: string, title?: string): void {
  const lines = content.split('\n');
  const maxLength = Math.max(...lines.map(l => l.length), title?.length || 0);
  const border = colors.border('─'.repeat(maxLength + 4));

  console.log();
  if (title) {
    console.log(`  ${colors.cherryRed.bold(title)}`);
  }
  console.log(`  ${border}`);
  lines.forEach(line => {
    console.log(`  ${colors.border('│')} ${line.padEnd(maxLength)} ${colors.border('│')}`);
  });
  console.log(`  ${border}`);
  console.log();
}

export function showFileOperation(operation: 'read' | 'write' | 'delete', filePath: string): void {
  const icon = operation === 'read' ? '📖' : operation === 'write' ? '✍️' : '🗑️';
  const verb = operation === 'read' ? 'Read' : operation === 'write' ? 'Wrote' : 'Deleted';
  console.log(colors.muted(`  ${icon} ${verb}: ${filePath}`));
}

export function showCodeBlock(code: string, language: string = 'code'): void {
  console.log(colors.muted(`\n\`\`\`${language}`));
  console.log(code);
  console.log(colors.muted(`\`\`\`\n`));
}

export class SessionStats {
  private startTime: number;
  private totalTokens: number;
  private requests: number;
  private filesWritten: number;
  private filesRead: number;

  constructor() {
    this.startTime = Date.now();
    this.totalTokens = 0;
    this.requests = 0;
    this.filesWritten = 0;
    this.filesRead = 0;
  }

  addRequest(tokens: number = 0) {
    this.requests++;
    this.totalTokens += tokens;
  }

  addFileWrite() {
    this.filesWritten++;
  }

  addFileRead() {
    this.filesRead++;
  }

  getElapsed(): number {
    return Date.now() - this.startTime;
  }

  getSummary(): string {
    return `[${formatDuration(this.getElapsed())} | ${this.requests} requests | ${
      this.totalTokens
    } tokens | ${this.filesWritten} written | ${this.filesRead} read]`;
  }

  display() {
    showSection('Session Stats');
    console.log(colors.muted(`  Duration:      ${formatDuration(this.getElapsed())}`));
    console.log(colors.muted(`  Requests:      ${this.requests}`));
    console.log(colors.muted(`  Tokens:        ${this.totalTokens}`));
    console.log(colors.muted(`  Files written: ${this.filesWritten}`));
    console.log(colors.muted(`  Files read:    ${this.filesRead}`));
    console.log();
  }
}
