# 🍓 @heysalad/sheri-ml-cli

> **Sheri ML** — Autonomous Coding Assistant CLI
>
> Your AI pair programmer that writes code, generates files, and helps you build faster.
> Powered by Gemini & Claude. Works on any device — laptop, server, or Raspberry Pi 🍓

[![npm version](https://img.shields.io/npm/v/@heysalad/sheri-ml-cli.svg)](https://www.npmjs.com/package/@heysalad/sheri-ml-cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🍓 Brand Identity

**HeySalad Colors:**
- 🍓 **Cherry Red** `#ed4c4c` — Primary brand color
- 🍓 **Peach** `#faa09a` — Secondary & success states
- 🍓 **Light Peach** `#ffd0cd` — Accents & borders
- 🍓 **White** `#ffffff` — Text & backgrounds

**Fonts:**
- **Grandstander** — Headlines & branding
- **Figtree** — Body text & interface

**Symbol:** 🍓 Strawberry — our friendly AI companion

---

## Install

```bash
npm install -g @heysalad/sheri-ml-cli
```

On Raspberry Pi:
```bash
curl -fsSL https://sheri-ml.heysalad.app/install.sh | bash
# or manually:
npm install -g @heysalad/sheri-ml-cli
```

---

## Quick Start

```bash
# 1. Configure your API key
sheri config
# Enter your Google AI Studio key (recommended: Gemini 3 Flash)
# Get key from: https://aistudio.google.com/app/apikey

# 2. Start the interactive coding assistant
sheri

# You'll see the custom prompt:
🍓 you ❯ create a REST API with Express

# Sheri will generate code and offer to write files
# Session stats show: [2.3s | 1 requests | 847 tokens | 0 files]

# Commands within chat:
/exit    - Exit chat
/clear   - Clear screen
/stats   - Show session stats
/help    - Show help
```

---

## Configuration

Run `sheri config` to set up interactively, or set environment variables:

```bash
# ~/.sheri-ml/.env  (or export in shell)

# Google AI Studio (recommended — Gemini 3 Flash)
GOOGLE_AI_STUDIO_KEY=AIza...
# Get key from: https://aistudio.google.com/app/apikey

# Anthropic (alternative)
ANTHROPIC_API_KEY=sk-ant-...
```

**Recommended Provider:** Google AI Studio (Gemini 3 Flash Preview)
- Fast and reliable
- Excellent for code generation
- Free tier available

Config is saved to `~/.sheri-ml/.env` (chmod 600).

---

## Features

### 🎯 Code Generation
Generate production-ready code in any language:
```bash
🍓 you ❯ create a REST API with Express and TypeScript
🍓 you ❯ write a function to parse CSV files
🍓 you ❯ generate React component for user profile
```

---

## Chat Mode Commands

```bash
sheri --chat   # or just: sheri
```

Inside chat:

| Command | Description |
|---------|-------------|
| `/model` | Interactive model picker |
| `/model gemini-31-pro` | Switch directly |
| `/mcp what is our ICP?` | Query MCP knowledge base |
| `/tool engineering create_github_issue title="Fix login"` | Call a domain tool |
| `/models` | List all models |
| `/router` | Enable SmartRouter |
| `/help` | Show all commands |
| `/exit` | Quit |

---

## MCP Domains & Tools

The MCP provider gives you access to all 8 HeySalad domains:

| Domain | Tools |
|--------|-------|
| `engineering` | create_github_issue, write_postmortem, generate_runbook |
| `sales` | draft_outbound_email, create_prospect_brief, score_deal |
| `customer-success` | answer_support_ticket, draft_churn_save_email |
| `marketing` | draft_blog_post, create_social_post, draft_email_campaign |
| `people` | draft_job_description, answer_hr_policy_question |
| `finance` | get_financial_dashboard, calculate_unit_economics |
| `data` | generate_weekly_metrics_report, detect_anomaly |
| `executive` | get_company_dashboard, draft_investor_update |

**Direct tool call:**
```bash
sheri --chat
# then:
/tool sales draft_outbound_email company="Acme" pain_point="slow deploys"
```

---

## Raspberry Pi Setup

```bash
# 1. Install Node.js 20 on RPi
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install Sheri CLI
npm install -g @heysalad/sheri-ml-cli

# 3. Configure (only needs MCP API key — no GPU required)
sheri config
# → select "HeySalad MCP API Key"
# → paste your key

# 4. Test
sheri "what is our engineering runbook process?"
```

The `mcp` model is the default and **requires no local GPU or large API quota** — it routes through the HeySalad cloud.

---

## Examples

```bash
# Engineering
sheri "write a postmortem for the payment outage"

# Sales
sheri --primary mcp "draft email to Acme about our AI tools"

# Data / metrics
sheri "generate weekly metrics report for this month"

# Chat with model switching
sheri --chat
> /model gemini-31-pro
> explain our infrastructure costs
> /tool finance get_financial_dashboard
> /exit
```

---

## Architecture

```
sheri CLI
  └─► MCPProvider → MCP Gateway (Cloudflare Worker)
        └─► RAG (Vectorize) + 8 Domain Tools
  └─► GeminiProvider → Google AI Studio
  └─► VertexAIProvider → Google Vertex AI
  └─► CheriMLProvider → cheri-ml.heysalad.app (self-hosted)
  └─► SmartRouter → auto-fallback across all above
```

---

## Part of HeySalad AI

`@heysalad/sheri-ml-cli` is part of the HeySalad AI monorepo:
[github.com/Hey-Salad/ai](https://github.com/Hey-Salad/ai)

Related packages:
- `@heysalad/harmony` — workforce management AI
- `@heysalad/core` — shared AI utilities

---

## License

MIT © HeySalad Inc.

---

*Sheri ML — building the future of autonomous software teams*
