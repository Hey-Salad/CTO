// Configuration management — supports global ~/.sheri-ml/.env + local .env

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import chalk from 'chalk';

export const CONFIG_DIR = path.join(os.homedir(), '.sheri-ml');
export const CONFIG_FILE = path.join(CONFIG_DIR, '.env');

export class Config {
  static load() {
    // Priority: local .env > ~/.sheri-ml/.env > process.env
    // Load global config first
    if (fs.existsSync(CONFIG_FILE)) {
      dotenv.config({ path: CONFIG_FILE });
    }
    // Then load local config (overrides global if keys conflict)
    const localEnv = path.join(process.cwd(), '.env');
    if (fs.existsSync(localEnv)) {
      dotenv.config({ path: localEnv, override: true });
    }
  }

  static get(key: string, defaultValue?: string): string {
    return process.env[key] || defaultValue || '';
  }

  static validate(): boolean {
    const keys = [
      'CHERI_ML_API_KEY', 'GOOGLE_AI_STUDIO_KEY', 'GOOGLE_AI_STUDIO_KEY_PRO',
      'VERTEX_AI_API_KEY', 'ANTHROPIC_API_KEY', 'MCP_API_KEY', 'HEYSALAD_API_KEY',
    ];
    const hasAny = keys.some(k => !!process.env[k]);
    if (!hasAny) {
      console.error(chalk.hex('#ed4c4c')('\n  🍓 No API keys found. Run: ') + chalk.white('sheri config\n'));
      return false;
    }
    return true;
  }

  /** Write a key=value to ~/.sheri-ml/.env */
  static set(key: string, value: string) {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });

    let content = fs.existsSync(CONFIG_FILE) ? fs.readFileSync(CONFIG_FILE, 'utf8') : '';
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith(key + '='));
    lines.push(`${key}=${value}`);
    fs.writeFileSync(CONFIG_FILE, lines.join('\n') + '\n', { mode: 0o600 });
    process.env[key] = value;
  }

  /** Read all config values (masked) */
  static list(): Record<string, string> {
    const result: Record<string, string> = {};
    const keys = [
      'MCP_API_KEY', 'MCP_GATEWAY_URL',
      'GOOGLE_AI_STUDIO_KEY', 'GOOGLE_AI_STUDIO_KEY_PRO',
      'VERTEX_AI_API_KEY', 'ANTHROPIC_API_KEY',
      'CHERI_ML_API_KEY', 'CHERI_ML_BASE_URL',
    ];
    for (const k of keys) {
      const v = this.get(k);
      result[k] = v ? v.slice(0, 8) + '...' + v.slice(-4) : '(not set)';
    }
    return result;
  }
}
