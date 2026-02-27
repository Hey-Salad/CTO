# Claude Code MCP Integration

## 🔗 MCP Gateway Connection

**Gateway URL**: https://heysalad-mcp-gateway.heysalad-o.workers.dev
**API Key**: e53082f52f527185d29cae6df78384dda7f542f8cc0983f640687256a0a42361

**Status**: ✅ Connected and operational

---

## 🛠️ Available MCP Servers

### 1. CheriML MCP Server (Port 5000)
**Location**: Running on cheri-ml-gpu-01  
**Endpoint**: http://34.133.133.219:5000/sse  
**Purpose**: Code generation using Cheri-ML-1.3B model

**Tools**:
- `generate_code()` - Generate code completions
- `complete_function()` - Complete function implementations
- `explain_code()` - Explain code snippets
- `refactor_code()` - Refactor code
- `check_model_health()` - Check model server status

### 2. HeySalad MCP Server (Port 5001)
**Endpoint**: http://34.133.133.219:5001/sse  
**Purpose**: Access HeySalad MCP Gateway (8 domains, 30+ tools)

**Domains**:
1. Engineering - GitHub, postmortems, runbooks
2. Sales - Outbound emails, prospect briefs
3. Customer Success - Support tickets, QBRs
4. Marketing - Blog posts, campaigns
5. People/HR - Job descriptions, agent registry
6. Finance - Dashboards, unit economics
7. Data - Analytics, anomaly detection
8. Executive - Investor updates, reports

---

## 🎯 CTO Project Structure

This repository consolidates three AI systems:

```
CTO/
├── cheri-ml/         # ML Inference Server (production)
│   └── serve_model.py
│
├── sheri-ml/         # Codex CLI (Gemini-powered)
│   └── codex-rs/
│
├── opencto/          # Multi-Agent System
│   ├── Sheri-ML/
│   └── opencto-dashboard/
│
└── docs/
```

---

## 🤖 AI Agent Roles

### Cheri-ML Agent
- **Role**: Code generation specialist
- **Model**: 1.3B parameters (fine-tuned DeepSeek Coder)
- **Best for**: Python, TypeScript, quick completions

### Sheri-ML Agent
- **Role**: Advanced coding assistant
- **Model**: Google Gemini 2.5 Pro
- **Best for**: Complex reasoning, refactoring, architecture

### OpenCTO Agents
- **Role**: Multi-agent swarm for DevOps
- **Communication**: MQTT pub/sub
- **Agents**: Deployment, Testing, Security, Code Review

---

## 🔧 Quick Commands

### Ask Knowledge Base
```bash
curl -X POST -H "X-API-Key: e53082f52f527185d29cae6df78384dda7f542f8cc0983f640687256a0a42361" \
  -H "Content-Type: application/json" \
  -d query:YOUR_QUESTION \
  https://heysalad-mcp-gateway.heysalad-o.workers.dev/mcp/ask
```

### Generate Code with Cheri-ML
```bash
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d prompt:def hello_world():
```

---

## 📊 GCP Resources

**Instance**: cheri-ml-gpu-01 (us-central1-a)  
**GPU**: Tesla T4 (15GB VRAM)  
**External IP**: 34.133.133.219  
**Project**: heysalad-finance  
**Account**: peter@heysalad.io

### Services Running
- Cheri-ML API (port 8000)
- CheriML MCP (port 5000)
- HeySalad MCP (port 5001)

---

## 🎯 How Claude Code Uses This

1. **Code Generation**: Uses CheriML MCP to generate code
2. **RAG Queries**: Uses HeySalad MCP to query knowledge base
3. **Multi-Agent Tasks**: Spawns OpenCTO agents for complex workflows

---

**Last Updated**: February 27, 2026
