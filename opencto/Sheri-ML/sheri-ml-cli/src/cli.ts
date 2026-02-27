#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { Config, CONFIG_FILE } from './utils/config';
import { CheriMLProvider } from './providers/cheri-ml';
import { GeminiProvider } from './providers/gemini';
import { VertexAIProvider } from './providers/vertex-ai';
import { ClaudeProvider } from './providers/claude';
import { MockProvider } from './providers/mock';
import { MCPProvider } from './providers/mcp';
import { teamCommand } from './commands/team';
import { metricsCommand } from './commands/metrics';
import { roadmapCommand } from './commands/roadmap';
import { createSmartRouter } from './providers/smart-router';
import { CoderAgent } from './agents/coder';
import { ModelProvider } from './types';
import { colors, symbols, BRAND_WITH_STRAWBERRY, separator } from './utils/colors';

Config.load();

const VERSION = '0.2.0';

const BRAND = BRAND_WITH_STRAWBERRY;

const AVAILABLE_MODELS = [
  'mcp',                         // HeySalad MCP Gateway (recommended for RPi)
  'gemini',                      // Gemini 3 Flash Preview
  'gemini-31-pro',               // Gemini 3.1 Pro Preview
  'gemini-31-pro-tools',         // Gemini 3.1 Pro Preview Custom Tools
  'vertex-ai',                   // Gemini 2.5 Flash Lite (Vertex)
  'cheri-ml',                    // Cheri ML 1.3B (self-hosted)
  'claude',                      // Anthropic Claude
  'mock',                        // Mock (testing)
  'router',                      // SmartRouter
];

const MODEL_DESCRIPTIONS: Record<string, string> = {
  'mcp':                  `${symbols.strawberry} HeySalad MCP Gateway — 8 domains, 19 tools, RAG (great for RPi)`,
  'gemini':               'Gemini 3 Flash Preview (Google AI Studio)',
  'gemini-31-pro':        'Gemini 3.1 Pro Preview — 1M context (AI Studio)',
  'gemini-31-pro-tools':  'Gemini 3.1 Pro Preview Custom Tools — agentic workflows',
  'vertex-ai':            'Gemini 2.5 Flash Lite (Google Vertex AI)',
  'cheri-ml':             `${symbols.strawberry} Cheri ML 1.3B — HeySalad self-hosted GPU`,
  'claude':               'Claude Sonnet (Anthropic)',
  'mock':                 'Mock AI — testing only',
  'router':               'SmartRouter — auto-fallback across providers',
};

function buildProviders(): Record<string, ModelProvider> {
  const p: Record<string, ModelProvider> = {};
  p['mock'] = new MockProvider();

  const mcpKey = Config.get('MCP_API_KEY') || Config.get('HEYSALAD_API_KEY');
  if (mcpKey) {
    try { p['mcp'] = new MCPProvider(mcpKey); } catch { /* skip */ }
  }

  try { p['cheri-ml'] = new CheriMLProvider(); } catch { /* skip */ }

  const k1 = Config.get('GOOGLE_AI_STUDIO_KEY');
  if (k1) {
    try {
      p['gemini'] = new GeminiProvider('gemini-3-flash-preview', k1);
    } catch { /* skip */ }
  }

  const k2 = Config.get('GOOGLE_AI_STUDIO_KEY_PRO') || k1;
  if (k2) {
    try {
      p['gemini-31-pro'] = new GeminiProvider('gemini-3.1-pro-preview', k2);
      p['gemini-31-pro-tools'] = new GeminiProvider('gemini-3.1-pro-preview-customtools', k2);
    } catch { /* skip */ }
  }

  if (Config.get('VERTEX_AI_API_KEY')) {
    try { p['vertex-ai'] = new VertexAIProvider('gemini-2.5-flash-lite'); } catch { /* skip */ }
  }

  if (Config.get('ANTHROPIC_API_KEY')) {
    try { p['claude'] = new ClaudeProvider(); } catch { /* skip */ }
  }

  return p;
}

function buildRouter(p: Record<string, ModelProvider>): ModelProvider {
  const ordered: ModelProvider[] = [];
  if (p['mcp']) ordered.push(p['mcp']);
  if (p['gemini-31-pro']) ordered.push(p['gemini-31-pro']);
  if (p['gemini']) ordered.push(p['gemini']);
  if (p['vertex-ai']) ordered.push(p['vertex-ai']);
  ordered.push(p['mock']);
  return createSmartRouter({ providers: ordered, fallbackEnabled: true });
}

function printModels(p: Record<string, ModelProvider>, current: string) {
  console.log(colors.peach.bold('\n  Available models:\n'));
  for (const id of AVAILABLE_MODELS) {
    const available = !!p[id] || id === 'router';
    const active = id === current;
    const mark = active ? colors.cherryRed(symbols.arrow) : available ? colors.muted('  ') : colors.error(symbols.cross);
    const label = active ? colors.cherryRed.bold(id) : available ? colors.white(id) : colors.muted(id);
    const desc = colors.muted(MODEL_DESCRIPTIONS[id] || '');
    console.log(`  ${mark} ${label.padEnd(28)} ${desc}`);
  }
  console.log();
}

// ─── config command ────────────────────────────────────────────────────────────

async function runConfig() {
  console.log(`\n  ${BRAND} ${colors.muted('configuration')}\n`);
  console.log(colors.muted(`  Config file: ${CONFIG_FILE}\n`));

  const currentConfig = Config.list();

  console.log(colors.peach('  Current settings:\n'));
  for (const [k, v] of Object.entries(currentConfig)) {
    console.log(`    ${colors.muted(k.padEnd(32))} ${v}`);
  }

  console.log();

  const { choice } = await inquirer.prompt([{
    type: 'list',
    name: 'choice',
    message: 'What would you like to configure?',
    choices: [
      { name: `${symbols.strawberry} HeySalad MCP API Key  (recommended — works on RPi, no GPU needed)`, value: 'mcp' },
      { name: 'Google AI Studio Key  (Gemini 3 Flash)', value: 'google' },
      { name: 'Google AI Studio Key PRO  (Gemini 3.1 Pro Preview)', value: 'google_pro' },
      { name: 'Anthropic Claude Key', value: 'claude' },
      { name: `${symbols.strawberry} Cheri ML endpoint`, value: 'cheri' },
      { name: 'Skip / done', value: 'done' },
    ],
  }]);

  if (choice === 'done') return;

  const prompts: Record<string, { key: string; message: string; hint: string }> = {
    mcp:        { key: 'MCP_API_KEY',               message: 'MCP API Key',               hint: 'Get from: https://sheri-ml.heysalad.app or cat ~/heysalad-mcp-api-key.txt' },
    google:     { key: 'GOOGLE_AI_STUDIO_KEY',       message: 'Google AI Studio Key',       hint: 'Get from: https://aistudio.google.com/app/apikey' },
    google_pro: { key: 'GOOGLE_AI_STUDIO_KEY_PRO',   message: 'Google AI Studio PRO Key',   hint: 'For Gemini 3.1 Pro Preview access' },
    claude:     { key: 'ANTHROPIC_API_KEY',           message: 'Anthropic API Key',          hint: 'Get from: https://console.anthropic.com' },
    cheri:      { key: 'CHERI_ML_BASE_URL',           message: 'Cheri ML Base URL',          hint: 'Default: https://cheri-ml.heysalad.app' },
  };

  const { key, message, hint } = prompts[choice];
  console.log(colors.muted(`  ${hint}\n`));

  const { value } = await inquirer.prompt([{
    type: 'password',
    name: 'value',
    message: `Enter ${message}:`,
    mask: '*',
  }]);

  if (value?.trim()) {
    Config.set(key, value.trim());
    console.log(colors.success(`\n  ${symbols.check} ${key} saved to ${CONFIG_FILE}\n`));
  }

  // Offer to also set MCP gateway URL if configuring MCP
  if (choice === 'mcp') {
    const gateway = Config.get('MCP_GATEWAY_URL') || 'https://heysalad-mcp-gateway.heysalad-o.workers.dev';
    Config.set('MCP_GATEWAY_URL', gateway);
    console.log(colors.muted(`  Gateway: ${gateway}\n`));
  }
}

// ─── mcp command ──────────────────────────────────────────────────────────────

async function runMCPStatus() {
  const apiKey = Config.get('MCP_API_KEY') || Config.get('HEYSALAD_API_KEY');
  if (!apiKey) {
    console.log(colors.warning(`\n  ${symbols.warning} MCP_API_KEY not set. Run: sheri config\n`));
    return;
  }

  const spinner = ora({ text: 'Checking MCP Gateway...', color: colors.spinner }).start();
  try {
    const provider = new MCPProvider(apiKey);
    const health = await provider.health();
    spinner.stop();
    console.log(colors.success(`\n  ${symbols.check} MCP Gateway: ${JSON.stringify(health)}\n`));
    console.log(colors.muted('  Domains: engineering · sales · customer-success · marketing'));
    console.log(colors.muted('           people · finance · data · executive\n'));
  } catch (err: any) {
    spinner.stop();
    console.log(colors.error(`\n  ${symbols.cross} MCP Gateway error: ${err.message}\n`));
  }
}

// ─── Main Program ─────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('sheri')
  .description('Sheri ML — Autonomous CTO CLI by HeySalad')
  .version(VERSION);

// sheri config
program
  .command('config')
  .description('Configure API keys and settings (saved to ~/.sheri-ml/.env)')
  .action(runConfig);

// sheri mcp
program
  .command('mcp')
  .description('Check MCP Gateway status and available domains')
  .action(runMCPStatus);

// sheri [prompt] (main command)
program
  .argument('[prompt]', 'Task or question for Sheri')
  .option('-p, --primary <model>', 'Primary model (run sheri --models to list)', 'mcp')
  .option('-s, --secondary <model>', 'Secondary model for review')
  .option('-r, --router', 'Use SmartRouter with auto-fallback')
  .option('-c, --chat', 'Interactive chat mode')
  .option('-m, --models', 'List all available models and exit')
  .option('--domain <domain>', 'Force a specific MCP domain (engineering|sales|etc.)')
  .option('-v, --verbose', 'Show provider info and debug output')
  .action(async (prompt, options) => {
    // Special flags
    if (options.models) {
      const providers = buildProviders();
      printModels(providers, options.primary);
      process.exit(0);
    }

    if (!Config.validate()) process.exit(1);

    console.log(`\n  ${BRAND} ${colors.muted(`v${VERSION}  Autonomous CTO`)}\n`);

    const providers = buildProviders();

    if (options.verbose) {
      const avail = Object.keys(providers).filter(k => k !== 'mock');
      console.log(colors.muted(`  Providers: ${avail.join(', ')}\n`));
    }

    // Resolve primary provider
    let currentModel = options.primary;
    let primaryProvider: ModelProvider;

    if (options.router || currentModel === 'router') {
      primaryProvider = buildRouter(providers);
      currentModel = 'router';
    } else {
      primaryProvider = providers[currentModel];
      if (!primaryProvider) {
        console.error(colors.error(`  Model '${currentModel}' not available.\n  Run: sheri --models\n`));
        process.exit(1);
      }
    }

    const secondaryProvider = options.secondary ? providers[options.secondary] : undefined;
    let agent = new CoderAgent(primaryProvider, secondaryProvider);

    // ── Single prompt mode ─────────────────────────────────────────────────
    if (!options.chat && prompt) {
      const spinner = ora({ text: `${symbols.strawberry} Thinking...`, color: colors.spinner }).start();
      try {
        const result = await agent.generateCode(prompt);
        spinner.stop();
        console.log(separator('─', 60));
        console.log(result);
        console.log(separator('─', 60));
        console.log(colors.success(`\n  ${symbols.check} Done\n`));
      } catch (err: any) {
        spinner.stop();
        console.error(colors.error(`  ${symbols.cross} Error: ${err.message}\n`));
        process.exit(1);
      }
      return;
    }

    // ── Chat mode ──────────────────────────────────────────────────────────
    console.log(colors.muted(`  Model: ${colors.white(currentModel)}  |  /help for commands\n`));

    while (true) {
      const { input } = await inquirer.prompt([{
        type: 'input',
        name: 'input',
        message: colors.cherryRed(`${symbols.strawberry} you`),
        prefix: '',
      }]);

      const msg = (input as string).trim();
      if (!msg) continue;

      // Slash commands
      if (msg.startsWith('/')) {
        const [cmd, ...args] = msg.slice(1).split(/\s+/);

        if (cmd === 'exit' || cmd === 'quit') {
          console.log(colors.muted(`\n  Goodbye ${symbols.strawberry}\n`)); break;
        }

        if (cmd === 'help') {
          console.log(colors.peach('\n  Slash Commands:\n'));
          const cmds = [
            ['/model [name]',    'Show or switch the active model'],
            ['/models',          'List all available models'],
            ['/mcp [domain query]', 'Query MCP knowledge base directly'],
            ['/tool <domain> <tool> [json]', 'Call an MCP domain tool'],
            ['/router',          'Switch to SmartRouter (auto-fallback)'],
            ['/clear',           'Clear screen'],
            ['/exit',            'Quit'],
          ];
          for (const [c, d] of cmds) {
            console.log(`  ${colors.white(c.padEnd(36))} ${colors.muted(d)}`);
          }
          console.log();
          continue;
        }

        if (cmd === 'models') { printModels(providers, currentModel); continue; }

        if (cmd === 'clear') { console.clear(); continue; }

        if (cmd === 'router') {
          currentModel = 'router';
          primaryProvider = buildRouter(providers);
          agent = new CoderAgent(primaryProvider, secondaryProvider);
          console.log(colors.success(`  ${symbols.check} SmartRouter active\n`));
          continue;
        }

        if (cmd === 'model') {
          if (args[0]) {
            currentModel = args[0];
          } else {
            const choices = AVAILABLE_MODELS
              .filter(id => !!providers[id] || id === 'router')
              .map(id => ({
                name: `${id.padEnd(28)} ${chalk.gray(MODEL_DESCRIPTIONS[id] || '')}`,
                value: id,
              }));
            const { selected } = await inquirer.prompt([{
              type: 'list', name: 'selected',
              message: 'Select model:', default: currentModel, choices,
            }]);
            currentModel = selected;
          }

          if (currentModel === 'router') {
            primaryProvider = buildRouter(providers);
          } else {
            primaryProvider = providers[currentModel];
            if (!primaryProvider) {
              console.log(colors.error(`  Model '${currentModel}' not available.`));
              printModels(providers, currentModel); continue;
            }
          }
          agent = new CoderAgent(primaryProvider, secondaryProvider);
          console.log(colors.success(`  ${symbols.check} Switched to ${colors.highlight(currentModel)}\n`));
          continue;
        }

        // /mcp [domain] [query...]
        if (cmd === 'mcp') {
          const mcpKey = Config.get('MCP_API_KEY') || Config.get('HEYSALAD_API_KEY');
          if (!mcpKey) { console.log(colors.warning(`  ${symbols.warning} MCP_API_KEY not set. Run: sheri config\n`)); continue; }
          const mcpProvider = providers['mcp'] as MCPProvider | undefined;
          if (!mcpProvider) { console.log(colors.warning(`  ${symbols.warning} MCP provider not available.\n`)); continue; }

          const query = args.join(' ');
          if (!query) { console.log(colors.muted('  Usage: /mcp <your question>\n')); continue; }

          const spinner = ora({ text: `${symbols.strawberry} Querying MCP...`, color: colors.spinner }).start();
          try {
            const answer = await mcpProvider.generate(query);
            spinner.stop();
            console.log(colors.cherryRed.bold(`\n${symbols.strawberry} sheri`) + colors.muted(' [mcp]'));
            console.log(answer, '\n');
          } catch (err: any) {
            spinner.stop();
            console.error(colors.error(`  ${symbols.cross} MCP Error: ${err.message}\n`));
          }
          continue;
        }

        // /tool <domain> <tool> [params as key=value...]
        if (cmd === 'tool') {
          const mcpProvider = providers['mcp'] as MCPProvider | undefined;
          if (!mcpProvider) { console.log(colors.warning(`  ${symbols.warning} MCP not available. Run: sheri config\n`)); continue; }

          const [domain, tool, ...paramParts] = args;
          if (!domain || !tool) {
            console.log(colors.muted('  Usage: /tool <domain> <tool> [key=value ...]\n'));
            console.log(colors.muted('  Example: /tool engineering create_github_issue title="Fix login bug"\n'));
            continue;
          }

          // Parse key=value pairs
          const params: Record<string, string> = {};
          for (const part of paramParts) {
            const [k, ...rest] = part.split('=');
            if (k) params[k] = rest.join('=').replace(/^"|"$/g, '');
          }

          const spinner = ora({ text: `${symbols.strawberry} Calling ${domain}/${tool}...`, color: colors.spinner }).start();
          try {
            const result = await mcpProvider.callTool(domain, tool, params);
            spinner.stop();
            console.log(colors.cherryRed.bold(`\n${symbols.strawberry} tool result`));
            console.log(JSON.stringify(result, null, 2), '\n');
          } catch (err: any) {
            spinner.stop();
            console.error(colors.error(`  ${symbols.cross} Tool error: ${err.message}\n`));
          }
          continue;
        }

        console.log(colors.warning(`  ${symbols.warning} Unknown command: /${cmd}  — type /help\n`));
        continue;
      }

      if (msg.toLowerCase() === 'exit' || msg.toLowerCase() === 'quit') {
        console.log(colors.muted(`\n  Goodbye ${symbols.strawberry}\n`)); break;
      }

      // Regular chat
      const spinner = ora({ text: `${symbols.strawberry} ${currentModel}...`, color: colors.spinner }).start();
      try {
        const response = await agent.chat(msg);
        spinner.stop();
        console.log(colors.cherryRed.bold(`\n${symbols.strawberry} sheri`) + colors.muted(` [${currentModel}]`));
        console.log(response, '\n');
      } catch (err: any) {
        spinner.stop();
        console.error(colors.error(`  ${symbols.cross} Error: ${err.message}\n`));
      }
    }
  });

// sheri team [list|tools|cost]
program
  .command('team [subcommand]')
  .description('Team roster, tool costs, and monthly burn rate')
  .action((subcommand: string | undefined, opts: unknown, cmd: { args: string[] }) => {
    Config.load();
    teamCommand(cmd.args);
  });

// sheri metrics [dora|kpis|all]
program
  .command('metrics [subcommand]')
  .description('DORA metrics and engineering KPIs')
  .action((subcommand: string | undefined, opts: unknown, cmd: { args: string[] }) => {
    Config.load();
    metricsCommand(cmd.args);
  });

// sheri roadmap [now|next|later|milestones]
program
  .command('roadmap [phase]')
  .description('Product roadmap: now, next, later milestones')
  .action((phase: string | undefined, opts: unknown, cmd: { args: string[] }) => {
    Config.load();
    roadmapCommand(cmd.args);
  });

program.parse();
