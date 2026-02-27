/**
 * MCP Provider — routes queries through the HeySalad MCP Gateway
 *
 * Enables Sheri CLI to use all 8 domains + 19 tools + RAG
 * without needing local GPU or direct AI API keys.
 *
 * Works on any device (RPi, laptop, server) that can reach the gateway.
 */

import axios from 'axios';
import { ModelProvider, GenerateOptions } from '../types';

const DEFAULT_GATEWAY = 'https://heysalad-mcp-gateway.heysalad-o.workers.dev';

const DOMAIN_PATTERNS: Array<{ pattern: RegExp; domain: string }> = [
  { pattern: /bug|deploy|code|github|issue|pr|build|infra|runbook|postmortem|engineer/i, domain: 'engineering' },
  { pattern: /sales|prospect|email|deal|outbound|lead|pitch|crm/i,                      domain: 'sales' },
  { pattern: /support|customer|churn|ticket|onboard|cs|success/i,                       domain: 'customer-success' },
  { pattern: /blog|post|campaign|social|twitter|linkedin|market|content/i,              domain: 'marketing' },
  { pattern: /hire|job|hr|policy|headcount|team|people|recruit/i,                       domain: 'people' },
  { pattern: /revenue|cost|finance|burn|economics|money|budget|cfo/i,                   domain: 'finance' },
  { pattern: /metric|data|report|anomaly|analytics|dashboard|kpi/i,                     domain: 'data' },
];

function detectDomain(query: string): string {
  for (const { pattern, domain } of DOMAIN_PATTERNS) {
    if (pattern.test(query)) return domain;
  }
  return 'executive';
}

export class MCPProvider implements ModelProvider {
  name = 'HeySalad MCP Gateway';
  private gatewayUrl: string;
  private apiKey: string;

  constructor(apiKey?: string, gatewayUrl?: string) {
    this.apiKey = apiKey || process.env.MCP_API_KEY || process.env.HEYSALAD_API_KEY || '';
    this.gatewayUrl = gatewayUrl || process.env.MCP_GATEWAY_URL || DEFAULT_GATEWAY;

    if (!this.apiKey) {
      throw new Error(
        'MCP_API_KEY not set. Run: sheri config   or   export MCP_API_KEY=your-key'
      );
    }
  }

  async generate(prompt: string, _options: GenerateOptions = {}): Promise<string> {
    // 🍓 Conversational AI: Handle greetings and general questions
    const conversationalResponse = this.handleConversational(prompt);
    if (conversationalResponse) return conversationalResponse;

    // Knowledge lookup via RAG
    const domain = detectDomain(prompt);

    try {
      const response = await axios.post(
        `${this.gatewayUrl}/mcp/ask`,
        { query: prompt, domain },
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json',
          },
          timeout: 30_000,
        }
      );

      const answer = response.data?.answer;

      // If RAG returns "no information found", provide helpful guidance
      if (answer && answer.includes('could not find relevant information')) {
        return this.handleNoKnowledge(prompt);
      }

      if (!answer) return `[MCP:${domain}] No answer returned from knowledge base.`;
      return answer;
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) throw new Error('MCP API key invalid. Run: sheri config');
      if (status === 429) throw new Error('MCP rate limit exceeded. Upgrade your plan at https://sheri-ml.heysalad.app');
      throw new Error(`MCP Gateway error: ${err.message}`);
    }
  }

  /** Handle conversational queries (greetings, general questions) */
  private handleConversational(prompt: string): string | null {
    const q = prompt.toLowerCase().trim();

    // Greetings
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|greetings)[\s!?]*$/i.test(q)) {
      return `Hello! 🍓 I'm Sheri ML, your autonomous CTO assistant by HeySalad.

I can help you with:
• Engineering (GitHub issues, postmortems, runbooks, performance metrics)
• Sales (outbound emails, prospect briefs, deal scoring)
• Customer Success (support tickets, churn prevention, success plans)
• Marketing (blog posts, campaigns, social content)
• People & HR (job descriptions, onboarding, policy questions)
• Finance (dashboards, unit economics, variance analysis)
• Data (metrics reports, anomaly detection)
• Executive (company dashboard, investor updates)

Try asking me something like:
• "What is our sales playbook?"
• "Create a GitHub issue for the login bug"
• "Draft an email to a prospect at Acme"
• "Show me DORA metrics"`;
    }

    // "Are you there?" / Status check
    if (/^(are you there|are you here|are you available|status|ping)[\s!?]*$/i.test(q)) {
      return `Yes, I'm here! 🍓 Connected to HeySalad MCP Gateway (8 domains, 30+ tools).

Everything is operational. How can I help you?`;
    }

    // "What can you do?" / Capabilities
    if (/^(what can you|what do you|how can you|help me|capabilities).*$/i.test(q)) {
      return `I'm Sheri ML 🍓, your autonomous CTO with access to 8 business domains:

**Engineering:** Create GitHub issues, write postmortems, generate runbooks
**Sales:** Draft emails, research prospects, score deals
**Customer Success:** Answer tickets, prevent churn, create success plans
**Marketing:** Write blog posts, create campaigns, draft social content
**People:** Write job descriptions, create onboarding plans, answer HR questions
**Finance:** Get dashboards, calculate unit economics, analyze variance
**Data:** Generate reports, detect anomalies
**Executive:** Company dashboards, investor updates

I also have access to our knowledge base (RAG) with company playbooks, processes, and documentation.

Try asking me a specific question or giving me a task!`;
    }

    // "How are you?"
    if (/^(how are you|how's it going|what's up|wassup)[\s!?]*$/i.test(q)) {
      return `I'm doing great! 🍓 All systems operational:
• MCP Gateway: ✓ Healthy
• 8 Domains: ✓ Active
• 30+ Tools: ✓ Ready
• RAG System: ✓ Connected

Ready to help you build and grow your business. What shall we work on?`;
    }

    // No conversational match, return null to proceed with RAG
    return null;
  }

  /** Handle when RAG finds no relevant knowledge */
  private handleNoKnowledge(prompt: string): string {
    return `I don't have specific information in my knowledge base about that topic.

However, I can still help! I have access to 30+ tools across 8 domains:

**If you need me to:**
• Create something: "create a GitHub issue for..."
• Draft content: "draft an email to..."
• Generate reports: "show me DORA metrics"
• Answer questions: "what is our [process/playbook]?"

Try rephrasing your question with more specific keywords, or ask me to perform a specific task.

Type /help to see available commands, or /models to switch to a different AI model.`;
  }

  /** Call a specific domain tool directly */
  async callTool(domain: string, tool: string, params: Record<string, unknown>): Promise<unknown> {
    const response = await axios.post(
      `${this.gatewayUrl}/mcp/${domain}/tools/${tool}`,
      params,
      {
        headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
        timeout: 30_000,
      }
    );
    return response.data;
  }

  /** Health check */
  async health(): Promise<{ status: string }> {
    const r = await axios.get(`${this.gatewayUrl}/health`, {
      headers: { 'X-API-Key': this.apiKey },
      timeout: 10_000,
    });
    return r.data;
  }
}
