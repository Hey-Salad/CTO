#!/usr/bin/env node
/**
 * 🍓 SheriML v2 — Proper Coding Assistant CLI
 * Focus: Code generation, file operations, actual building
 * NOT a knowledge base lookup tool
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Config } from './utils/config';
import { GeminiProvider } from './providers/gemini';
import { ClaudeProvider } from './providers/claude';
import { MCPProvider } from './providers/mcp';
import { colors, symbols } from './utils/colors';
import { loginCommand } from './commands/login';
import { logoutCommand } from './commands/logout';
import { whoamiCommand } from './commands/whoami';
import { MQTTClient } from './mqtt/client';
import { TaskHandler } from './mqtt/task-handler';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

Config.load();

const VERSION = '0.4.0';
const BRAND = `${symbols.strawberry} ${colors.cherryRed.bold('sheri')}${chalk.bold('ml')}`;

const AVAILABLE_MODELS = [
  'gemini',           // Gemini 3 Flash (recommended)
  'claude',           // Claude Sonnet
  'mcp',              // HeySalad MCP Gateway (fallback)
];

const MODEL_DESCRIPTIONS: Record<string, string> = {
  'gemini': `Gemini 3 Flash Preview — Fast, excellent for code (${colors.cherryRed('recommended')})`,
  'claude': 'Claude Sonnet — Anthropic',
  'mcp': `${symbols.strawberry} HeySalad MCP Gateway — Fallback for RAG queries`,
};

interface SessionStats {
  startTime: number;
  totalTokens: number;
  requests: number;
  filesWritten: number;
}

const session: SessionStats = {
  startTime: Date.now(),
  totalTokens: 0,
  requests: 0,
  filesWritten: 0,
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function showStats() {
  const elapsed = Date.now() - session.startTime;
  return colors.muted(
    `[${formatDuration(elapsed)} | ${session.requests} requests | ${session.totalTokens} tokens | ${session.filesWritten} files]`
  );
}

function buildProviders(): Record<string, any> {
  const p: Record<string, any> = {};

  const geminiKey = Config.get('GOOGLE_AI_STUDIO_KEY') || Config.get('GOOGLE_AI_STUDIO_KEY_PRO');
  if (geminiKey) {
    try {
      p['gemini'] = new GeminiProvider('gemini-3-flash-preview', geminiKey);
    } catch (err) {
      // skip
    }
  }

  const claudeKey = Config.get('ANTHROPIC_API_KEY');
  if (claudeKey) {
    try {
      p['claude'] = new ClaudeProvider();
    } catch (err) {
      // skip
    }
  }

  const mcpKey = Config.get('MCP_API_KEY');
  const mcpUrl = Config.get('MCP_GATEWAY_URL') || 'https://heysalad-mcp-gateway.heysalad-o.workers.dev';
  if (mcpKey) {
    try {
      p['mcp'] = new MCPProvider(mcpUrl, mcpKey);
    } catch (err) {
      // skip
    }
  }

  return p;
}

function printModels(providers: Record<string, any>, current: string) {
  console.log(colors.peach.bold('\n  Available models:\n'));
  for (const id of AVAILABLE_MODELS) {
    const available = !!providers[id];
    const active = id === current;
    const mark = active
      ? colors.cherryRed(symbols.arrow)
      : available
      ? colors.muted('  ')
      : colors.error(symbols.cross);
    const label = active
      ? colors.cherryRed.bold(id)
      : available
      ? colors.white(id)
      : colors.muted(id);
    const desc = colors.muted(MODEL_DESCRIPTIONS[id] || '');
    console.log(`  ${mark} ${label.padEnd(20)} ${desc}`);
  }
  console.log();
  console.log(colors.muted('  Set default: sheri config --model <name>'));
  console.log(colors.muted('  Use specific: sheri --primary <name>\n'));
}

async function buildProvider(preferredModel?: string) {
  const providers = buildProviders();

  // Use explicitly requested model if provided
  if (preferredModel) {
    if (providers[preferredModel]) {
      return providers[preferredModel];
    } else {
      throw new Error(
        `Model '${preferredModel}' not available. Run: sheri --models`
      );
    }
  }

  // Use saved preference
  const savedModel = Config.get('PRIMARY_MODEL');
  if (savedModel && providers[savedModel]) {
    return providers[savedModel];
  }

  // Auto-select: gemini > claude > mcp
  if (providers['gemini']) return providers['gemini'];
  if (providers['claude']) return providers['claude'];
  if (providers['mcp']) return providers['mcp'];

  throw new Error(
    `No AI provider configured. Run: sheri config

Recommended: Google AI Studio (Gemini 3 Flash)
Get key from: https://aistudio.google.com/app/apikey`
  );
}

async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
  session.filesWritten++;
}

async function readFile(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

async function chat(preferredModel?: string) {
  console.clear();
  console.log(`\n  ${BRAND} ${colors.muted(`v${VERSION}`)}\n`);
  console.log(colors.peach('  Autonomous Coding Assistant\n'));

  const provider = await buildProvider(preferredModel);
  console.log(colors.muted(`  Using: ${provider.name}\n`));

  const conversationHistory: Array<{ role: string; content: string }> = [];

  const systemPrompt = `You are Sheri ML, an expert coding assistant. You help developers:
- Write clean, production-ready code
- Debug and fix issues
- Refactor and improve existing code
- Explain complex concepts
- Generate tests and documentation

When asked to create files, respond with:
FILE: path/to/file.ext
\`\`\`language
code here
\`\`\`

Be concise but thorough. Focus on practical solutions.`;

  conversationHistory.push({ role: 'system', content: systemPrompt });

  while (true) {
    // Custom prompt with ❯
    const { input } = await inquirer.prompt([
      {
        type: 'input',
        name: 'input',
        message: colors.cherryRed(`${symbols.strawberry} you ${symbols.arrow}`),
        prefix: '',
      },
    ]);

    const msg = input.trim();
    if (!msg) continue;

    // Commands
    if (msg === '/exit' || msg === '/quit') {
      console.log(colors.muted(`\n  Goodbye! ${showStats()}\n`));
      break;
    }

    if (msg === '/clear') {
      console.clear();
      continue;
    }

    if (msg === '/stats') {
      console.log(`\n  ${colors.peach.bold('Session Stats:')}`);
      console.log(`  ${showStats()}\n`);
      continue;
    }

    if (msg === '/help') {
      console.log(colors.peach('\n  Commands:\n'));
      console.log(`  ${colors.white('/exit, /quit')}   ${colors.muted('Exit chat')}`);
      console.log(`  ${colors.white('/clear')}         ${colors.muted('Clear screen')}`);
      console.log(`  ${colors.white('/stats')}         ${colors.muted('Show session stats')}`);
      console.log(`  ${colors.white('/help')}          ${colors.muted('Show this help')}\n`);
      continue;
    }

    // Add to conversation
    conversationHistory.push({ role: 'user', content: msg });

    // Show thinking indicator
    const startTime = Date.now();
    const spinner = ora({
      text: colors.muted(`${symbols.strawberry} thinking...`),
      color: 'red',
    }).start();

    try {
      session.requests++;

      // Generate response
      const response = await provider.generate(msg, {
        systemPrompt,
        temperature: 0.7,
        maxTokens: 2048,
      });

      const duration = Date.now() - startTime;
      spinner.stop();

      // Estimate tokens (rough)
      const estimatedTokens = Math.ceil((msg.length + response.length) / 4);
      session.totalTokens += estimatedTokens;

      // Add to history
      conversationHistory.push({ role: 'assistant', content: response });

      // Display response
      console.log(`\n${colors.cherryRed.bold(`${symbols.strawberry} sheri`)}`);
      console.log(colors.muted(`  [${formatDuration(duration)} | ~${estimatedTokens} tokens]\n`));

      // Check if response contains file instructions
      if (response.includes('FILE:')) {
        console.log(response);
        console.log();

        // Ask if user wants to write files
        const { shouldWrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldWrite',
            message: colors.peach('Write these files?'),
            default: true,
          },
        ]);

        if (shouldWrite) {
          const fileMatches = response.matchAll(/FILE:\s*([^\n]+)\n```(\w+)?\n([\s\S]+?)```/g);
          let written = 0;

          for (const match of fileMatches) {
            const [, filePath, , content] = match;
            const cleanPath = filePath.trim();
            const cleanContent = content.trim();

            try {
              await writeFile(cleanPath, cleanContent);
              console.log(colors.success(`  ${symbols.check} Wrote: ${cleanPath}`));
              written++;
            } catch (err: any) {
              console.log(colors.error(`  ${symbols.cross} Failed: ${cleanPath} - ${err.message}`));
            }
          }

          if (written > 0) {
            console.log(colors.success(`\n  ${symbols.check} Wrote ${written} file(s)`));
          }
        }
      } else {
        console.log(response);
      }

      console.log();
    } catch (err: any) {
      spinner.stop();
      console.error(colors.error(`\n  ${symbols.cross} Error: ${err.message}\n`));
    }
  }
}

const program = new Command();

program
  .name('sheri')
  .description('🍓 SheriML — Autonomous Coding Assistant')
  .version(VERSION);

program
  .command('config')
  .description('Configure AI provider keys and default model')
  .option('--model <name>', 'Set default model (gemini, claude, mcp)')
  .action(async (options) => {
    console.log(`\n  ${BRAND} ${colors.muted('configuration')}\n`);

    // If --model flag, just set default model
    if (options.model) {
      const validModels = ['gemini', 'claude', 'mcp'];
      if (!validModels.includes(options.model)) {
        console.log(colors.error(`\n  ${symbols.cross} Invalid model. Choose: ${validModels.join(', ')}\n`));
        return;
      }
      Config.set('PRIMARY_MODEL', options.model);
      console.log(colors.success(`\n  ${symbols.check} Default model set to: ${options.model}\n`));
      return;
    }

    // Show current config
    const currentConfig = Config.list();
    if (Object.keys(currentConfig).length > 0) {
      console.log(colors.peach('  Current settings:\n'));
      for (const [k, v] of Object.entries(currentConfig)) {
        const display = k.includes('KEY') ? `${v.substring(0, 12)}...` : v;
        console.log(`    ${colors.muted(k.padEnd(32))} ${display}`);
      }
      console.log();
    }

    // Provider selection
    const { choice } = await inquirer.prompt([
      {
        type: 'list',
        name: 'choice',
        message: 'What would you like to configure?',
        choices: [
          {
            name: `${symbols.strawberry} Google AI Studio (Gemini 3 Flash) — ${colors.cherryRed('recommended')}`,
            value: 'google',
          },
          { name: 'Anthropic Claude Key', value: 'claude' },
          { name: `${symbols.strawberry} HeySalad MCP API Key (fallback)`, value: 'mcp' },
          { name: 'Set default model', value: 'model' },
          { name: 'Done / cancel', value: 'done' },
        ],
      },
    ]);

    if (choice === 'done') return;

    if (choice === 'model') {
      const providers = buildProviders();
      const availableModels = AVAILABLE_MODELS.filter((m) => providers[m]);

      if (availableModels.length === 0) {
        console.log(colors.warning(`\n  ${symbols.warning} No models configured yet. Configure a provider first.\n`));
        return;
      }

      const { model } = await inquirer.prompt([
        {
          type: 'list',
          name: 'model',
          message: 'Choose default model:',
          choices: availableModels,
        },
      ]);

      Config.set('PRIMARY_MODEL', model);
      console.log(colors.success(`\n  ${symbols.check} Default model set to: ${model}\n`));
      return;
    }

    const prompts: Record<
      string,
      { key: string; message: string; hint: string }
    > = {
      google: {
        key: 'GOOGLE_AI_STUDIO_KEY',
        message: 'Google AI Studio Key',
        hint: 'Get from: https://aistudio.google.com/app/apikey',
      },
      claude: {
        key: 'ANTHROPIC_API_KEY',
        message: 'Anthropic API Key',
        hint: 'Get from: https://console.anthropic.com',
      },
      mcp: {
        key: 'MCP_API_KEY',
        message: 'MCP API Key',
        hint: 'Get from: cat ~/heysalad-mcp-api-key.txt',
      },
    };

    const { key, message, hint } = prompts[choice];
    console.log(colors.muted(`  ${hint}\n`));

    const { value } = await inquirer.prompt([
      {
        type: 'password',
        name: 'value',
        message: `Enter ${message}:`,
        mask: '*',
      },
    ]);

    if (value?.trim()) {
      Config.set(key, value.trim());
      console.log(
        colors.success(`\n  ${symbols.check} ${key} saved!\n`)
      );
      console.log(colors.muted('  Try: sheri\n'));
    }

    // Set MCP gateway URL if configuring MCP
    if (choice === 'mcp') {
      const gateway =
        Config.get('MCP_GATEWAY_URL') ||
        'https://heysalad-mcp-gateway.heysalad-o.workers.dev';
      Config.set('MCP_GATEWAY_URL', gateway);
      console.log(colors.muted(`  Gateway: ${gateway}\n`));
    }
  });

// Auth commands
program
  .command('login')
  .description('Login to HeySalad')
  .option('--with-token', 'Login with API token (for SSH/remote)')
  .option('--register', 'Register new account')
  .action(loginCommand);

program
  .command('logout')
  .description('Logout from HeySalad')
  .action(logoutCommand);

program
  .command('whoami')
  .description('Show current user info and usage')
  .action(whoamiCommand);

program
  .option('--models', 'List available models')
  .option('--primary <model>', 'Use specific model (gemini, claude, mcp)')
  .option('--mqtt', 'Enable MQTT mode for multi-agent collaboration')
  .option('--broker <url>', 'MQTT broker URL', 'mqtt://localhost:1883')
  .option('--agent-id <id>', 'Agent ID (auto-generated if not provided)')
  .option('--role <role>', 'Agent role (deployment, testing, review, security, monitoring, documentation, database, general)', 'general')
  .option('--swarm <name>', 'Swarm identifier', 'opencto-dev')
  .action(async (options) => {
    // MQTT multi-agent mode
    if (options.mqtt) {
      await startMQTTAgent(options);
      return;
    }

    // Normal interactive CLI mode
    const providers = buildProviders();
    const currentModel = Config.get('PRIMARY_MODEL') || 'auto';

    // Show models list
    if (options.models) {
      printModels(providers, currentModel);
      return;
    }

    // Check if any provider configured
    if (Object.keys(providers).length === 0) {
      console.log(colors.error(`\n  ${symbols.cross} No AI provider configured\n`));
      console.log(colors.muted('  Run: sheri config\n'));
      process.exit(1);
    }

    await chat(options.primary);
  });

async function startMQTTAgent(options: any) {
  console.log(`\n${BRAND} ${colors.muted('— Multi-Agent Mode')}\n`);

  // Generate agent ID if not provided
  const agentId = options.agentId || `sheri-ml-${crypto.randomBytes(4).toString('hex')}`;

  console.log(colors.peach('  Starting agent:'));
  console.log(`    Agent ID: ${colors.cherryRed(agentId)}`);
  console.log(`    Role: ${colors.cherryRed(options.role)}`);
  console.log(`    Swarm: ${colors.cherryRed(options.swarm)}`);
  console.log(`    Broker: ${colors.muted(options.broker)}`);
  console.log();

  try {
    // Create MQTT client
    const mqtt = new MQTTClient({
      brokerUrl: options.broker,
      agentId,
      swarm: options.swarm,
      role: options.role,
    });

    // Create task handler
    const taskHandler = new TaskHandler(mqtt, agentId, options.role);

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      mqtt.once('connected', resolve);
      mqtt.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 30000);
    });

    console.log(colors.success(`\n${symbols.check} Agent started successfully\n`));
    console.log(colors.muted('  Press Ctrl+C to shutdown\n'));

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n');
      mqtt.disconnect();
      setTimeout(() => {
        console.log(colors.muted('  Goodbye! 👋\n'));
        process.exit(0);
      }, 1000);
    });

    process.on('SIGTERM', () => {
      mqtt.disconnect();
      setTimeout(() => process.exit(0), 1000);
    });

    // Keep process alive
    await new Promise(() => {});
  } catch (error: any) {
    console.error(colors.error(`\n  ${symbols.cross} Failed to start agent: ${error.message}\n`));
    process.exit(1);
  }
}

program.parse();
