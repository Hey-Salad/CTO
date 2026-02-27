# 🍓 OpenCTO - Autonomous Development Suite

**The Future of Software Development: AI-Powered CTOs**

> "In the future, every project will have its own AI CTO. Traditional companies have 1 CTO. With OpenCTO, you can have 100."

---

## 📁 Repository Structure

```
OpenCTO/
├── Sheri-ML/                          # Autonomous CTO CLI
│   ├── sheri-ml-cli/                  # CLI application
│   ├── heysalad-sheri-auth/           # Authentication service
│   └── *.md                            # Documentation
│
├── Cheri-ML/                          # Web-based IDE (coming soon)
│   └── (VS Code-like experience)
│
├── Beri-ML/                           # Mobile + Agent Visualization (coming soon)
│   └── (Real-time collaboration UI)
│
├── VISION.md                          # Vision and architecture
├── MQTT-ARCHITECTURE.md               # Multi-agent communication
└── README.md                          # This file
```

---

## 🎯 What is OpenCTO?

**OpenCTO** is a suite of AI-powered development tools that enable autonomous software development:

### Sheri-ML (Autonomous CTO)
- **Lightweight CLI** - Node.js based, runs anywhere
- **Authentication system** - OAuth device flow + API tokens
- **Multi-agent capable** - Communicate via MQTT
- **Specialized roles** - Deployment, testing, security, etc.

**Current Status:** ✅ Phase 1 MVP Complete

### Cheri-ML (IDE)
- **Web-based IDE** - Visual Studio Code experience
- **Desktop app** - Mac & Raspberry Pi
- **AI code generation** - Integrated with Sheri-ML

**Current Status:** In Development

### Beri-ML (Visualization)
- **Real-time dashboard** - See agents collaborate
- **Mobile app** - Monitor from anywhere
- **Agent graphs** - Visual task flows

**Current Status:** Planned

---

## 🚀 Quick Start

### Sheri-ML CLI

**Install:**
```bash
cd OpenCTO/Sheri-ML/sheri-ml-cli
npm install
npm run build
```

**Authenticate:**
```bash
# Register
sheri login --register

# Or login with existing account
sheri login

# Or use token (SSH-friendly)
export HEYSALAD_API_KEY=hsa_xxx
sheri whoami
```

**Generate Code:**
```bash
sheri
# 🍓 you ❯ create a REST API with Express
```

**Multi-Agent Mode (MQTT):**
```bash
# Start deployment agent
sheri --mqtt --role deployment --broker mqtt://localhost:1883

# Start testing agent
sheri --mqtt --role testing --broker mqtt://localhost:1883

# Start code review agent
sheri --mqtt --role review --broker mqtt://localhost:1883
```

---

## 🏗️ Architecture

### Single Agent Mode
```
User → Sheri-ML CLI → LLM (Gemini/Claude) → Code Generated
```

### Multi-Agent Mode
```
User → Task → MQTT Broker
                   ↓
    ┌──────────────┼──────────────┐
    ↓              ↓              ↓
Agent #1       Agent #2       Agent #3
(Review)       (Deploy)       (Test)
    ↓              ↓              ↓
    └──────────────┼──────────────┘
                   ↓
              MQTT Broker
                   ↓
              Task Complete
```

---

## 🔧 Technology Stack

### Sheri-ML CLI
- **Runtime:** Node.js 18+
- **Language:** TypeScript
- **Auth:** JWT tokens, OAuth device flow
- **Communication:** MQTT (mqtt.js)
- **LLMs:** Gemini 3 Flash, Claude Sonnet
- **Storage:** Cloudflare D1

### Authentication Service
- **Platform:** Cloudflare Workers
- **Database:** D1 (SQLite)
- **API:** REST
- **Security:** SHA-256 password hashing, 90-day token expiry

### MQTT Broker (Options)
- **Local:** mosquitto
- **Cloud:** AWS IoT Core
- **Managed:** CloudMQTT

---

## 📚 Documentation

### Core Docs
- **[VISION.md](./VISION.md)** - Vision and future roadmap
- **[MQTT-ARCHITECTURE.md](./MQTT-ARCHITECTURE.md)** - Multi-agent communication design

### Sheri-ML Docs
- **[Authentication Phase 1](./Sheri-ML/SHERIML-AUTH-PHASE1-COMPLETE.md)** - Auth system documentation
- **[API Documentation](./Sheri-ML/heysalad-sheri-auth/README.md)** - Auth service API
- **[CLI Auth Research](./Sheri-ML/cli-auth-research.md)** - Industry best practices
- **[Implementation Plan](./Sheri-ML/heysalad-cli-auth-implementation-plan.md)** - Complete roadmap

---

## 🎯 Roadmap

### Phase 1: Foundation ✅
- [x] Sheri-ML CLI basic functionality
- [x] Authentication system (OAuth + API tokens)
- [x] Cloudflare Workers deployment
- [x] D1 database integration
- [x] Documentation and testing

### Phase 2: Multi-Agent ✅
- [x] MQTT integration
- [x] Agent roles and specialization
- [x] Task queue and assignment
- [x] tmux orchestration scripts
- [x] Basic monitoring

### Phase 3: Intelligence (Q2 2026)
- [ ] Agent learning from past actions
- [ ] Predictive task assignment
- [ ] Auto-scaling based on load
- [ ] Web dashboard (Beri-ML MVP)

### Phase 4: Ecosystem (Q3 2026)
- [ ] Open source agent marketplace
- [ ] Custom agent plugins
- [ ] Multi-project orchestration
- [ ] CTOaaS (CTO as a Service)

---

## 🌟 Why OpenCTO?

### Traditional DevOps
- 1 CTO per company
- Humans are bottlenecks
- Slow deployment cycles
- Limited to business hours
- **Speed:** Days to weeks

### With OpenCTO
- 100 AI CTOs per company
- AI works 24/7
- Autonomous deployments
- Self-healing systems
- **Speed:** Minutes to hours

### The Future
- Every project has its own AI CTO
- Human CTOs manage AI CTOs
- 1 human can manage 100 projects
- Development speed: **100x faster**

---

## 🤝 Contributing

OpenCTO is currently in active development by HeySalad. We plan to open source components as they mature.

**Current Focus:**
- MQTT integration for Sheri-ML
- Multi-agent orchestration
- Web dashboard (Beri-ML)

---

## 📊 Status

| Component | Status | Version | Next Milestone |
|-----------|--------|---------|----------------|
| **Sheri-ML CLI** | ✅ Multi-Agent Ready | 0.5.0 | LLM integration |
| **Auth Service** | ✅ Production | 1.0.0 | Token scopes |
| **MQTT Multi-Agent** | ✅ Phase 1 Complete | - | LLM task execution |
| **Cheri-ML IDE** | 🚧 Development | - | Alpha release |
| **Beri-ML Dashboard** | 📋 Planned | - | Design phase |

---

## 📞 Contact

**Company:** HeySalad
**Vision:** Peter
**Development:** Claude (Anthropic)
**Status:** Active Development 🍓

---

## 📄 License

Proprietary - HeySalad © 2026

---

*"The future is autonomous. The future is OpenCTO."*
